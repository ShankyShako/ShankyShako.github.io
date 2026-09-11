import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { PetCounter } from './PetCounter';
import { PetDissolve, type DissolveShot } from './PetDissolve';
import { PetWalkAway } from './PetWalkAway';
import { usePetAssets } from '../hooks/usePetAssets';
import { frameScale, usePetEngine } from '../hooks/usePetEngine';
import { onPetAway, setPetPresence } from '../lib/petBus';
import { EFFECTS, FRAMES, FRAME_SRC, PET_IMAGES } from './petFrames';

/**
 * Routes he does not appear on. The research and experience pages are the two
 * that get read rather than played with, and a man striking JoJo poses along
 * the bottom of a page about ransomware detection is the wrong register.
 */
const BANISHED = new Set(['/research', '/experience']);

/** How many motes get pulled into the hole. */
const DUST = 12;
/** Longest a mote can be in flight — how long the hole lingers after closing. */
const DUST_MAX_MS = 2400;

/**
 * The second easter egg. A bag hangs off the top-right corner until someone
 * pokes it, then Genova falls in, gets up, and pootles along the bottom of the
 * window striking JoJo poses. Throwing him through the hole in the left wall
 * ends it and puts the bag back.
 *
 * Three stacked elements rather than one, because three different things want
 * to write `transform` and they must not collide: the wrapper carries the rAF
 * loop's position and `scaleX(±1)` facing, the effect's own wrapper carries the
 * shake, and each <img> carries its own entrance. The manga overlay also has to
 * live outside the mirrored wrapper or the katakana renders backwards whenever
 * he turns around.
 */
export function DesktopPet() {
  const assets = usePetAssets(PET_IMAGES);
  const {
    wrapRef, fxRef, frame, effect, peeking, place, holeShown, holeStyle, handlers,
    resetToCorner, leaving, abortLeaving, requestLeave,
  } = usePetEngine();

  const { pathname } = useLocation();
  const banished = BANISHED.has(pathname);
  const spriteRef = useRef<HTMLImageElement>(null);
  const [ash, setAsh] = useState<DissolveShot | null>(null);

  /* Whether the walk-away clip has shown its first frame. The idle sprite
     stays up until it has, so a slow load looks like him standing still, not
     a gap in the page. Always read together with `leaving`, so a stale `true`
     after the clip ends never hides the bag. */
  const [walkShown, setWalkShown] = useState(false);
  useEffect(() => { if (!leaving) setWalkShown(false); }, [leaving]);

  /* Snapshot the sprite exactly where it stands, then take the real one away in
     the same commit — otherwise the pet and its own ashes are on screen
     together for a frame.
     Copied rather than measured: the wrapper's matrix already holds position,
     rotation and facing, and the <img>'s inline box holds the rest. A
     bounding rect would flatten the rotation into an axis-aligned box and
     stretch him whenever he is caught mid-fall. */
  const banish = useCallback(() => {
    const wrap = wrapRef.current;
    const el = spriteRef.current;
    if (!wrap || !el) return resetToCorner();

    const width = parseFloat(el.style.width);
    const height = parseFloat(el.style.height);
    if (!width || !height) return resetToCorner();

    setAsh({
      src: FRAME_SRC(frame),
      transform: getComputedStyle(wrap).transform,
      left: parseFloat(el.style.left) || 0,
      top: parseFloat(el.style.top) || 0,
      width,
      height,
      flipY: el.style.transform === 'scaleY(-1)',
    });
    resetToCorner();
  }, [frame, resetToCorner, wrapRef]);

  /* Whether the pet subtree is rendered. Deliberately state rather than
     `banished` itself: the snapshot has to be taken off live DOM, and keying
     the markup straight off the route would unmount him — nulling both refs —
     before any effect got the chance. So the banished route renders him once
     more, this runs before the browser paints it, and only then does he go. */
  const [gone, setGone] = useState(() => BANISHED.has(pathname));

  /* Position anything that just mounted before the browser paints it. Without
     this the overlay flashes once at the window's top-left corner, because the
     rAF loop does not get to write its transform until the following frame.
     `gone` counts as a mount: leaving a banished route brings the whole subtree
     back with a bare wrapper, and that is the same flash. `peeking` counts too:
     the walk-away hands him back to the corner from a timer, not from inside
     the loop, and without this the bag is drawn for one frame at his feet. */
  useLayoutEffect(place, [place, effect, assets, gone, peeking]);

  /* Declared after `place` on purpose. Layout effects fire in declaration
     order, and the snapshot copies the wrapper's transform — so `place` has to
     have written this frame's position before it is read, or he disintegrates
     at the top-left corner of the window. */
  useLayoutEffect(() => {
    if (!banished) {
      setGone(false);
      return;
    }
    /* Nothing to dissolve if he never came out of the bag. And if he's already
       walking off, he's a video, while the ashes are cut from a sprite. He
       just finishes leaving early. */
    if (peeking || leaving) {
      if (leaving) resetToCorner();
      setGone(true);
      return;
    }
    /* Reduce Motion gets the outcome without the spectacle. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resetToCorner();
      setGone(true);
      return;
    }
    banish();
    setGone(true);
    /* `peeking` is intentionally not a dependency: resetToCorner flips it true
       from inside here, and re-running on that would fire a second dissolve at
       a pet that is already gone. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banished, pathname]);

  /* The hole outlives its own dismissal. Unmounting the moment he stops being
     held would cut every mote off mid-flight, which reads as a rendering
     glitch rather than an ending — so it stays mounted and fades while the
     motes finish the trip they were already on. */
  const [holeMounted, setHoleMounted] = useState(false);

  /* The counter would give the easter egg away if it sat there on a fresh load,
     so it waits for someone to poke the bag. Latched rather than tied to
     `peeking`: he goes back in the corner when he escapes through the wall, and
     the number blinking out on the way would read as a bug. */
  const [found, setFound] = useState(false);
  useEffect(() => { if (!peeking) setFound(true); }, [peeking]);

  /* The chat bot's "send him away" uses the same exit as the rare roll. The
     bot also gets told whether anyone is out to send, so it doesn't offer to
     dismiss a pet that's already in the bag or on a page he's banned from. */
  useEffect(() => onPetAway(() => { requestLeave(); }), [requestLeave]);
  useEffect(() => {
    setPetPresence(peeking || leaving || gone ? 'away' : 'out');
  }, [peeking, leaving, gone]);

  useEffect(() => {
    if (holeShown) {
      setHoleMounted(true);
      return;
    }
    const t = window.setTimeout(() => setHoleMounted(false), DUST_MAX_MS);
    return () => window.clearTimeout(t);
  }, [holeShown]);

  /* Fixed per mount: re-rolling these every render would make the dust jump. */
  const dust = useMemo(
    () =>
      Array.from({ length: DUST }, (_, i) => ({
        px: 55 + Math.random() * 150,
        py: (Math.random() - 0.5) * 150,
        size: 2 + Math.random() * 3,
        dur: 1.1 + Math.random() * 1.1,
        delay: (i / DUST) * 1.6 + Math.random() * 0.2,
      })),
    [],
  );

  /* All or nothing: a half-loaded set is a broken-image glyph in the corner. */
  if (assets !== 'ready') return null;

  const stand = window.innerWidth <= 620 ? 92 : 132;
  const f = FRAMES[frame];
  const s = frameScale(frame, stand);

  /* The peek shows a sliver of bag, but it is still the only way into the whole
     easter egg — so the target stays the size the pet used to be rather than
     the size of what is drawn. Deliberately larger than its own artwork. */
  const PEEK_HIT_W = stand * 0.72;
  const PEEK_HIT_H = stand * 0.85;

  /* The walk swaps frames four times a second; morphing between them turns a
     gait into pudding. Every other transition gets the stretch. */
  const isWalk = frame === 'walk_l' || frame === 'walk_r';

  const fx = effect ? EFFECTS[effect] : null;
  /* Normalised by the longest side so a wide banner and a tall column carry the
     same visual weight. */
  const fxScale = fx ? (stand * 1.2) / Math.max(fx.w, fx.h) : 1;
  const fxW = fx ? fx.w * fxScale : 0;
  const fxH = fx ? fx.h * fxScale : 0;

  return (
    <>
      {/* Outlives the pet on purpose: the wrapper below is already unmounted by
          the time these are drifting, and this is what is left of him. */}
      {ash && <PetDissolve {...ash} onDone={() => setAsh(null)} />}

      {gone ? null : (
      <>
      {holeMounted && (
        <div
          className={`pet-hole${holeShown ? '' : ' is-closing'}`}
          style={holeStyle}
          aria-hidden="true"
        >
          {dust.map((d, i) => (
            <span
              key={i}
              className="pet-dust"
              style={
                {
                  '--px': `${d.px}px`,
                  '--py': `${d.py}px`,
                  '--s': `${d.size}px`,
                  '--dur': `${d.dur}s`,
                  '--delay': `${d.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {effect && fx && (
        <div className="pet-fx" ref={fxRef} aria-hidden="true">
          <span className="pet-fx-shake">
            <img
              src={FRAME_SRC(effect)}
              alt=""
              style={{
                width: fxW,
                height: fxH,
                /* Hung off the top of whichever body box is showing, not at a
                   fixed height — that is what makes one set of effects sit
                   correctly over a lying pose and a standing one. The overlap
                   is deliberate: manga sound effects crowd the figure. */
                left: -fxW / 2,
                top: -f.bh * s - fxH * 0.65,
              }}
            />
          </span>
        </div>
      )}

      {found && <PetCounter />}

      <div
        ref={wrapRef}
        className={`pet${peeking ? ' is-peek' : ''}${leaving ? ' is-leaving' : ''}`}
        aria-hidden="true"
        {...handlers}
      >
        <img
          ref={spriteRef}
          className="pet-frame"
          src={FRAME_SRC(frame)}
          alt=""
          draggable={false}
          style={{
            /* Geometry in CSS rather than width/height attributes so it can be
               transitioned — see the morph note in components.css. */
            width: f.w * s,
            height: f.h * s,
            left: -f.ax * s,
            top: -f.ay * s,
            transitionDuration: isWalk ? '0ms' : undefined,
            /* About the image's own centre, so the box the engine positions is
               untouched — this turns the picture over, not the sprite's
               footprint. */
            transform: f.flipY ? 'scaleY(-1)' : undefined,
            visibility: leaving && walkShown ? 'hidden' : undefined,
          }}
        />
        {leaving && (
          <PetWalkAway
            stand={stand}
            onShown={() => setWalkShown(true)}
            onDone={resetToCorner}
            onFail={abortLeaving}
          />
        )}
        {/* The wrapper is a 0x0 origin marker and the sprite is
            pointer-events:none, so without this nothing is clickable. Sized to
            his body rather than the PNG: the file also contains the bag and a
            margin of transparency, and an invisible rectangle that wide would
            swallow clicks meant for the page behind him.
            Left out while he walks away: there's nothing to grab, and nothing
            should block the page while the clip plays. */}
        {!leaving && (
          <span
            className="pet-hit"
            style={
              peeking
                ? {
                    left: -PEEK_HIT_W * 0.55,
                    top: -PEEK_HIT_H * 0.2,
                    width: PEEK_HIT_W,
                    height: PEEK_HIT_H,
                  }
                : {
                    left: -(f.bw * s) / 2,
                    top: -f.bh * s,
                    width: f.bw * s,
                    height: f.bh * s,
                  }
            }
          />
        )}
      </div>
      </>
      )}
    </>
  );
}
