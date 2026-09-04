import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { experience } from '../data/experience';
import { anchors } from '../data/anchors';
import { useDeck } from '../hooks/useDeck';
import { FloorCracks, type Field } from './FloorCracks';

const COUNT = experience.length;
const INTRO_KEY = 'deck-intro-played';
const FLASH_MS = 2400;

/* Deterministic per-card jitter. Seeded off the array index so a role always
   lands the same way, and appending a seventh never reshuffles the first six. */
function noise(i: number) {
  const n = Math.sin((i + 1) * 127.1) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/* Depth response asymptotes instead of growing linearly: card 12 adds barely
   more mess than card 8, so a long deck reads as deep rather than as a rosette
   of cardboard fanned through 40 degrees. */
const settle = (d: number) => 1 - Math.exp(-d / 1.6);

/* One function list, always in the same order, for every transform this
   component writes. Mixing `translate() rotate()` with `translate() translateZ()
   rotate()` makes the browser fall back to matrix interpolation, which takes the
   short way round and turns the landing into a wobble.

   `z` is altitude above the floor. The view stays straight down throughout —
   nothing ever tilts — so height is carried by perspective alone: a card in the
   air is nearer the overhead camera and therefore bigger, and it shrinks to
   floor size as it lands. */
function compose(x: number, y: number, z: number, rot: number, scale: number) {
  return `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translateZ(${z.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
}

function restingPose(i: number, top: number) {
  const d = i - top;
  if (d <= 0) return { x: 0, y: 0, rot: 0, scale: 1 };
  const e = settle(d);

  /* Each card is pushed out along its own angle rather than by raw noise on x
     and y, because noise near zero puts a card exactly behind the one above it
     and it vanishes from the pile entirely. An angle always displaces. */
  const angle = noise(i) * Math.PI;
  const spread = 52 * e;
  /* Squashed vertically: the camera is above the floor, not level with it. */
  const y = Math.sin(angle) * spread * 0.58 + 15 * e;

  /* The face-up card is never tilted. Rotation is a record of impacts already
     taken, and it does that job just as well one card down. Given a floor of 3
     degrees so no card ever lands suspiciously square. */
  const spin = noise(i + 7);

  return {
    x: Math.cos(angle) * spread + noise(i + 13) * 7 * e,
    y,
    rot: (spin * 7 + Math.sign(spin) * 3) * e,
    scale: 1 - 0.05 * e,
  };
}

function restingTransform(i: number, top: number) {
  const { x, y, rot, scale } = restingPose(i, top);
  return compose(x, y, 0, rot, scale);
}

/* The arrival.

   Cards come in one at a time from the bottom of the stage and travel straight
   up to their landing spot, then drop onto the pile. Still birds-eye: the card
   never turns. Altitude carries the flight — a card in the air is nearer the
   overhead camera and looms, and it shrinks to floor size as it comes down.

   These are absolute positions on the stage, not offsets from the landing spot,
   so every card runs the same straight line in from bottom centre regardless of
   where in the pile it ends up. The last leg, into the resting pose, is the
   fall. */
const FLIGHT: { x: number; y: number; z: number; o: number; k: number }[] = [
  { x: 0, y: 336, z: 296, o: 0, k: 0 },
  { x: 0, y: 300, z: 332, o: 1, k: 0.14 },
  { x: 0, y: 170, z: 430, o: 1, k: 0.5 },
  /* Over its destination and still up. Everything after this is the drop. */
  { x: 0, y: 22, z: 522, o: 1, k: 0.8 },
  { x: 0, y: 7, z: 278, o: 1, k: 0.92 },
];

export function ExperienceDeck({ heading }: { heading: ReactNode }) {
  const { sectionRef, index, goTo } = useDeck(COUNT);
  const { hash } = useLocation();
  const cards = useRef<(HTMLElement | null)[]>([]);
  const stage = useRef<HTMLDivElement | null>(null);

  /* The fracture has to start on the card's real silhouette, so it is measured
     rather than assumed. The SVG is 1000x640 with preserveAspectRatio=slice, so
     it covers the stage at max(w/1000, h/640) and one viewBox unit is that many
     CSS pixels. A guessed footprint left a clean margin around the card, which
     read as the card sitting next to damage instead of causing it. */
  const [field, setField] = useState<Field>({ footW: 384, footH: 312, visW: 1000, visH: 640 });

  /* During the intro the pile is still assembling, so the cracks follow the
     build rather than the scroll. null once the intro is over or skipped. */
  const [landed, setLanded] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const st = stage.current;
      const card = cards.current[0];
      if (!st || !card) return;
      const s0 = st.getBoundingClientRect();
      /* The face card is untilted, so its box is its true size — including any
         scale the pile is under on a short screen. */
      const c0 = card.getBoundingClientRect();
      if (!s0.width || !s0.height) return;
      const scale = Math.max(s0.width / 1000, s0.height / 640);
      setField({
        footW: c0.width / scale,
        footH: c0.height / scale,
        visW: s0.width / scale,
        visH: s0.height / scale,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    /* A deep link is a request for one specific card. Playing a 1.2s assembly
       over the top of it, while useHashHighlight is scrolling somewhere, is two
       animations fighting. */
    const deepLinked = Boolean(hash);
    let played = true;
    try {
      played = sessionStorage.getItem(INTRO_KEY) === '1';
    } catch {
      /* Private browsing. Skipping the intro is the safe way to be wrong. */
    }
    if (played || deepLinked) return;

    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* Nothing to do; worst case it replays next visit. */
    }

    if (!('animate' in Element.prototype)) return;

    setLanded(0);
    const timers: number[] = [];
    const DUR = 820;
    const GAP = 150;

    /* Oldest first, so the pile genuinely builds bottom-up. */
    for (let order = 0; order < COUNT; order++) {
      const i = COUNT - 1 - order;
      const el = cards.current[i];
      if (!el) continue;
      const pose = restingPose(i, 0);

      el.animate(
        [
          ...FLIGHT.map((f) => ({
            transform: compose(f.x, f.y, f.z, pose.rot, pose.scale),
            opacity: f.o,
            offset: f.k,
          })),
          { transform: compose(pose.x, pose.y, 0, pose.rot, pose.scale), opacity: 1, offset: 1 },
        ],
        {
          duration: DUR,
          delay: order * GAP,
          /* Eases out along the trail, then the last leg is the drop. */
          easing: 'cubic-bezier(.34,.72,.36,1)',
          fill: 'backwards',
        },
      );

      timers.push(
        window.setTimeout(() => {
          setLanded(order + 1);
          stage.current?.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }],
            { duration: 150 },
          );
        }, order * GAP + DUR),
      );
    }

    timers.push(window.setTimeout(() => setLanded(null), (COUNT - 1) * GAP + DUR + 60));
    return () => {
      timers.forEach(clearTimeout);
      /* StrictMode mounts, tears down and remounts. The second mount sees the
         sessionStorage flag and returns early, so without this the crack count
         stays stranded wherever the aborted run left it and the floor never
         draws. */
      setLanded(null);
    };
  }, [hash]);

  /* useHashHighlight scrolls to the proxy anchor and flashes it; the anchor is
     an invisible 1px marker in the scroll track, so mirror the flash onto the
     card the visitor was actually sent to. */
  useEffect(() => {
    if (!hash) return;
    const slug = decodeURIComponent(hash.slice(1));
    const i = experience.findIndex((r) => anchors.experience.get(r.org) === slug);
    if (i < 0) return;
    setFlash(i);
    const t = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [hash]);

  /* Divided by the number of *impacts*, not the number of cards: the floor
     card was set down on an unbroken floor, so arriving back at it has to leave
     nothing behind. (COUNT - index) / COUNT never reaches zero and left a
     fracture under the 2020 card with nothing to have caused it. */
  const impacts = Math.max(1, COUNT - 1);
  const cracks = landed === null ? (impacts - index) / impacts : landed / COUNT;

  return (
    <section
      className="deck-scroller"
      ref={sectionRef as React.RefObject<HTMLElement>}
      /* One viewport of tail, not one stage: the pile only reaches its last
         level once the page can scroll (count-1) steps past the section top,
         and a section sized to the stage runs out of page before it gets
         there. */
      style={{ height: `calc(${COUNT - 1} * var(--deck-step) + 100vh)` }}
    >
      {/* Real scroll targets for the chat bot's /experience#slug links. */}
      {experience.map((role, i) => (
        <span
          key={`anchor-${role.org}`}
          className="deck-anchor"
          id={anchors.experience.get(role.org)}
          style={{ top: `calc(${i} * var(--deck-step))` }}
        />
      ))}

      {/* The heading is pinned with the stage rather than left in the page
          above it. Scrolling here is meant to drive the pile and nothing else,
          and a title that slides away while you do it makes the whole section
          feel like it is sliding off the screen. */}
      <div className="deck-pinned">
        <div className="deck-heading">{heading}</div>

        <div className="deck-stage" ref={stage}>
        <span className="deck-depression" />
          <FloorCracks progress={cracks} field={field} />

        <div className="deck-pile">
          {experience.map((role, i) => {
            const d = i - index;
            const gone = d < 0;
            return (
              <article
                key={role.org}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className={`deck-card${d === 0 ? ' is-face' : ''}${flash === i ? ' is-target' : ''}`}
                style={{
                  zIndex: COUNT - i,
                  opacity: gone ? 0 : 1,
                  transform: gone
                    ? compose(0, -150, 620, 0, 1)
                    : restingTransform(i, index),
                }}
                aria-current={d === 0 ? 'true' : undefined}
              >
                {/* Every card gets the band whether or not it has marks to put in
                    it, so the type below always starts at the same height. A role
                    with no logo gets its name set instead — a wordmark is still a
                    lockup, and an empty band is a hole. */}
                <div className={`deck-logos deck-logos-${role.logos?.length ?? 0}`}>
                  {role.logos?.length ? (
                    role.logos.map((logo) => (
                      <span className="deck-logo" key={logo.src}>
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => e.currentTarget.closest('.deck-logo')?.classList.add('img-missing')}
                        />
                      </span>
                    ))
                  ) : (
                    <span className="deck-wordmark">{role.short ?? role.org}</span>
                  )}
                </div>

                {/* Only when the band showed marks. Where the band already set
                    the name, repeating it here is the same words twice. */}
                {role.logos?.length ? <p className="deck-org">{role.short ?? role.org}</p> : null}
                <h3 className="deck-title">{role.title}</h3>
                <p className="deck-date">{role.date}</p>
                {role.tagline ? <p className="deck-tagline">{role.tagline}</p> : null}

                <ul className="deck-points">
                  {(role.bullets ?? [role.blurb]).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>

                <span className="deck-veil" style={{ opacity: d <= 0 ? 0 : Math.min(0.76, 0.3 + 0.55 * settle(d)) }} />
              </article>
            );
          })}
        </div>

          <nav className="deck-rail" aria-label="Roles">
          <ul>
            {experience.map((role, i) => (
              <li key={`rail-${role.org}`}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === index ? 'true' : undefined}
                >
                  <span className="deck-rail-year">{role.date.includes('Present') ? 'Now' : role.date.slice(-4)}</span>
                  <span className="deck-rail-tick" />
                  <span className="deck-rail-name">{role.short ?? role.org}</span>
                </button>
              </li>
            ))}
          </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}
