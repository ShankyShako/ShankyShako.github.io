import { useCallback, useEffect, useRef, useState } from 'react';

import { useAudio } from '../context/AudioContext';
import {
  EFFECT_KEYS, FRAMES, PEEK_FRAME, POINT_FRAME, POSE_FRAMES,
} from '../components/petFrames';
import type { EffectKey, FrameKey } from '../components/petFrames';

/* --------------------------------------------------------------------------
 * Tuning. Everything is px/second or degrees/second and gets multiplied by a
 * clamped delta, so none of it is framerate-dependent.
 * ----------------------------------------------------------------------- */
const G = 520;            // gravity, px/s²
const VY_TERM = 170;      // terminal descent for the leaf fall — slow on purpose
const SWAY_AMP = 46;      // px either side of the drift line
const SWAY_PER = 1.6;     // seconds per full swing
const SWAY_W = (2 * Math.PI) / SWAY_PER;
const TILT = 14;          // degrees of lean at the extremes of a swing
const AIR_DRAG = 1.2;     // 1/s, how fast a throw's sideways speed bleeds off

/* Cumulative thresholds for what he does next. Poses are the punctuation, not
   the sentence — he is mostly just wandering about, and a pet that strikes an
   attitude every few seconds stops reading as a pet. Everything above ROLL_IDLE
   is a pose, so these two numbers are the whole distribution:
   55% walking, 32% idle, 13% pose. */
const ROLL_WALK = 0.55;
const ROLL_IDLE = 0.87;

const WALK_SPEED = 58;    // px/s
/* Two swaps a second — one full left-right cycle. Chosen off the travel, not
   by taste: he stands ~132px, so a stride is roughly 55px, and at 58px/s that
   is a footfall every ~0.45s. Swapping any faster and his legs outrun the
   ground he covers, which reads as skating rather than walking. */
const WALK_FPS = 2;
const WALK_STEP_S = 1 / WALK_FPS;

/* Held up by the back: the photo is horizontal, so a quarter turn stands him
   up with his head toward the ceiling and his feet dangling. */
const DRAG_ROT = -90;

/* --------------------------------------------------------------------------
 * The way out.
 *
 * Until now the only escape was reloading, which is a poor answer for someone
 * who has decided they are done with him. There is a hole in the left wall:
 * throw him into it hard enough and he leaves through it, the bag reappears in
 * the corner, and the whole thing is back to where it started.
 *
 * Deliberately not easy. It needs a genuine throw, aimed, at one specific wall
 * — nobody triggers this by accident, which is what keeps him a pet rather than
 * a dismissable banner. The hole only draws while you are holding him or he is
 * mid-flight, so the page is not carrying a permanent smudge in its margin.
 * ----------------------------------------------------------------------- */
const HOLE_Y_FRAC = 0.62;   // of viewport height, at the hole's centre
const HOLE_H = 180;
const ESCAPE_VX = -300;     // px/s leftward, minimum, to break through
const ESCAPE_S = 1.5;       // travel off-screen, then a beat, then the bag returns
const THROW_MAX = 700;    // px/s clamp on release velocity
const DRAG_THRESHOLD = 8; // px of travel before a press becomes a grab
const MARGIN = 6;
const LAND_S = 0.45;

/* The corner peek. Only the bag shows, tucked past the top-right corner and
   clipped by both edges, so what you notice is a green sliver rather than a
   person. The hit box stays person-sized regardless (see PEEK_HIT_* in
   DesktopPet) — a target you can barely see still has to be easy to hit. */
const PEEK_INSET_X = 34;
const PEEK_Y = 15;
const PEEK_ROT = 16;

const NEAR_PX = 170;          // how close to the chat button counts as "near"
const FAB_COOLDOWN_MS = 12_000;
const POINT_S = 1.2;


/* --------------------------------------------------------------------------
 * Sound. Jet Set Radio chops, played as a rising combo.
 *
 * Climb 1→8, then hold on 6 for as long as the poking keeps up:
 * 1,2,3,4,5,6,7,8,6,6,6,6… Three seconds untouched and the next pose starts
 * again at 1.
 *
 * Nothing retriggers before the clip already playing has finished, and the gate
 * is each sample's own length rather than one number for all eight. That is
 * what protects the two long hits at the top of the climb — 7 and 8 run 0.9s
 * and 1.2s, and under a fixed cooldown a spam of poses would cut them off
 * before they landed. It also stops the chain talking over itself.
 * ----------------------------------------------------------------------- */
const SFX = (n: number) => `/audio/pet/effect_${n}.mp3`;
/* Going through the wall gets its own sound rather than the next chop — the
   combo is the language of poses, and leaving is not a pose. */
const SFX_WHOOSH = '/audio/pet/Whoosh.mp3';
const WHOOSH_MS = 1123;
/* Milliseconds, index 0 = effect_1. Measured with `afinfo public/audio/pet/*`;
   re-measure if the files are ever replaced. */
const SFX_MS = [627, 731, 705, 705, 705, 627, 888, 1228];
const SFX_COUNT = SFX_MS.length;
/* 1-based. Where the chain sits once it has topped out. */
const SFX_HOLD = 6;
const COMBO_RESET_MS = 3000;

/* Poses the visitor caused make noise; poses he strikes on his own do not.
   The scheduler fires one every few seconds, and a portfolio that chirps at an
   unattended tab is a different thing from a pet that answers when poked. Flip
   this to true to let the idle loop sing too. */
const SFX_ON_IDLE_POSES = false;

type Phase =
  | 'peek' | 'falling' | 'flying' | 'landing'
  | 'idle' | 'walking' | 'posing' | 'grabbed' | 'escaping';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** How tall he stands, in CSS px. */
const standPx = () => (window.innerWidth <= 620 ? 92 : 132);

/** Scale that renders `frame` at the right size next to every other frame. */
export function frameScale(frame: FrameKey, stand: number) {
  const f = FRAMES[frame];
  return (stand * f.k) / Math.max(f.bw, f.bh);
}

export function usePetEngine() {
  const { playSfx } = useAudio();

  const wrapRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);

  /* The only values React is allowed to know about. Position and facing are
     written straight to the DOM by the loop, so walking costs ~4 renders a
     second and standing still costs none. */
  const [frame, setFrameState] = useState<FrameKey>(PEEK_FRAME);
  const [effect, setEffect] = useState<EffectKey | null>(null);
  const [peeking, setPeeking] = useState(true);
  /* Drawn only while he is held or in flight — that is the whole window in
     which the hole is any use, and the only time it is worth the ink. */
  const [holeShown, setHoleShown] = useState(false);

  const s = useRef({
    phase: 'peek' as Phase,
    x: 0, y: 0, vx: 0, vy: 0,
    rot: 0, facing: 1 as 1 | -1,
    swayAnchorX: 0, swayPhase: 0,
    stateClock: 0, stateDur: 0,
    walkClock: 0, walkStep: 0, walkDir: 1 as 1 | -1,
    probeClock: 0,
    fabX: null as number | null,
    leftKeepOut: 0, rightKeepOut: Number.POSITIVE_INFINITY,
    fabCooldown: 0,
    combo: 0, comboMaxed: false, lastPoseAt: -Infinity,
    sfxUntil: 0,
    frame: PEEK_FRAME,
    drag: null as null | {
      id: number; sx: number; sy: number; ox: number; oy: number;
      grabbed: boolean; lt: number; lx: number; ly: number;
    },
    vw: 0, vh: 0, stand: 132, reduced: false,
    lastTs: 0, raf: 0,
  });

  /* Read through a ref: the loop's effect has [] deps and must never close over
     a stale playSfx. Same pattern ChatWidget uses for its audio mirror. */
  const sfxRef = useRef(playSfx);
  sfxRef.current = playSfx;

  const setFrame = useCallback((next: FrameKey) => {
    if (s.current.frame === next) return;
    s.current.frame = next;
    setFrameState(next);
  }, []);

  /**
   * Fires the next chop and reports how long it runs, so the caller can hold
   * the pose for at least that long. Returns 0 when the previous clip is still
   * playing — the combo does not advance on a poke that made no sound.
   */
  const comboSfx = useCallback((now: number) => {
    const p = s.current;
    if (now < p.sfxUntil) return 0;

    if (now - p.lastPoseAt > COMBO_RESET_MS) {
      p.combo = 0;
      p.comboMaxed = false;
    }
    p.lastPoseAt = now;

    const n = p.comboMaxed ? SFX_HOLD : p.combo + 1;
    const ms = SFX_MS[n - 1];
    sfxRef.current(SFX(n), 2.2);
    p.sfxUntil = now + ms;

    /* `comboMaxed` rather than testing for 6 directly: 6 is also a rung on the
       way up, and that one has to carry on to 7. */
    if (!p.comboMaxed && p.combo >= SFX_COUNT - 1) p.comboMaxed = true;
    else if (!p.comboMaxed) p.combo += 1;

    return ms;
  }, []);

  /**
   * Writes both transforms from the current simulation state.
   *
   * The loop does this every frame, but a newly mounted element has no
   * transform until the *next* frame — so the manga overlay would appear at the
   * top-left corner of the window for one frame before snapping into place, and
   * so would the pet itself on first mount. The component calls this from a
   * layout effect, which lands before the browser paints.
   */
  const place = useCallback(() => {
    const p = s.current;
    const t = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
    if (wrapRef.current) {
      wrapRef.current.style.transform =
        `${t} rotate(${p.rot.toFixed(1)}deg) scaleX(${p.facing})`;
    }
    if (fxRef.current) fxRef.current.style.transform = t;
  }, []);

  const groundY = useCallback(() => s.current.vh - 4, []);
  const holeTop = useCallback(() => s.current.vh * HOLE_Y_FRAC - HOLE_H / 2, []);
  /* x is his ground-contact point, which sits mid-body — clamping it to the
     viewport alone would walk half of him off the edge. */
  const halfW = useCallback(() => s.current.stand * 0.45, []);

  const enter = useCallback(
    (next: Phase, dur: number, f?: FrameKey) => {
      const p = s.current;
      /* Held, airborne, or on the way through — the hole has to outlast his
         exit, or it blinks out from under him at the moment he uses it. */
      setHoleShown(next === 'grabbed' || next === 'flying' || next === 'escaping');
      p.phase = next;
      p.stateClock = 0;
      p.stateDur = dur;
      if (next !== 'walking') { p.walkClock = 0; p.walkStep = 0; }
      if (next !== 'posing') setEffect(null);
      if (f) setFrame(f);
    },
    [setFrame],
  );

  /**
   * Back to the beginning: bag in the corner, combo forgotten, cooldowns clear.
   * Everything the session accumulated is dropped, so a visitor who posts him
   * through the wall gets the same pet a fresh page load would.
   */
  const resetToCorner = useCallback(() => {
    const p = s.current;
    p.phase = 'peek';
    p.x = p.vw - PEEK_INSET_X;
    p.y = PEEK_Y;
    p.rot = PEEK_ROT;
    p.vx = 0; p.vy = 0; p.facing = 1;
    p.stateClock = 0; p.stateDur = 0;
    p.combo = 0; p.comboMaxed = false; p.lastPoseAt = -Infinity; p.sfxUntil = 0;
    p.fabCooldown = 0;
    setHoleShown(false);
    setEffect(null);
    setPeeking(true);
    setFrame(PEEK_FRAME);
  }, [setFrame]);

  /** Strike a pose: frame, a manga overlay behind him, and the next chop. */
  const striking = useCallback(
    (now: number, f: FrameKey, dur: number, withSound: boolean) => {
      const ms = withSound ? comboSfx(now) : 0;
      /* Hold the pose for at least as long as its sound. Otherwise the long
         chops at the top of the combo outlive the frame that triggered them and
         he is back to walking while his own hit is still ringing. */
      enter('posing', Math.max(dur, ms / 1000), f);
      setEffect(pick(EFFECT_KEYS));
    },
    [comboSfx, enter],
  );

  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const p = s.current;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    p.reduced = mq.matches;
    const onMq = (e: MediaQueryListEvent) => { p.reduced = e.matches; };
    mq.addEventListener('change', onMq);

    const measure = () => {
      p.vw = window.innerWidth;
      p.vh = window.innerHeight;
      p.stand = standPx();
    };
    measure();
    p.x = p.vw - PEEK_INSET_X;
    p.y = PEEK_Y;
    p.rot = PEEK_ROT;

    const onResize = () => {
      measure();
      if (p.phase === 'peek') { p.x = p.vw - PEEK_INSET_X; return; }
      p.x = clamp(p.x, MARGIN + halfW(), p.vw - MARGIN - halfW());
      if (p.phase !== 'falling' && p.phase !== 'flying' && p.phase !== 'grabbed') {
        p.y = groundY();
      }
    };

    /* rAF is paused while the tab is hidden; without this the first frame back
       carries the whole absence as one delta. The clamp below is the backstop. */
    const onVis = () => { if (document.visibilityState === 'visible') p.lastTs = performance.now(); };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', onVis);

    const chooseNext = () => {
      /* Weighted, with two rules on top: never come to rest inside the audio
         bar or chat button's footprint (walk through, just do not park there),
         and re-roll facing only when idling or walking so a pose never snaps
         around. */
      const parked = p.x < p.leftKeepOut || p.x > p.rightKeepOut;
      const roll = Math.random();

      if (p.reduced) {
        /* Motion the visitor did not ask for is out; he still changes pose. */
        striking(performance.now(), pick(POSE_FRAMES), rand(2.5, 5), SFX_ON_IDLE_POSES);
        return;
      }

      if (parked || roll < ROLL_WALK) {
        p.walkDir = parked
          ? (p.x < p.leftKeepOut ? 1 : -1)
          : (p.x < 160 ? 1 : p.x > p.vw - 160 ? -1 : (Math.random() < 0.5 ? 1 : -1));
        p.facing = p.walkDir;
        enter('walking', rand(1.2, 3), 'walk_l');
      } else if (roll < ROLL_IDLE) {
        p.facing = Math.random() < 0.5 ? 1 : -1;
        enter('idle', rand(0.9, 2.2), 'idle');
      } else {
        striking(performance.now(), pick(POSE_FRAMES), rand(1.2, 2.4), SFX_ON_IDLE_POSES);
      }
    };

    const step = (ts: number) => {
      const dt = Math.min((ts - p.lastTs) / 1000, 0.05);
      p.lastTs = ts;

      /* Reads first, writes last. The chat button only exists while the bot
         gateway answers /health, and useBotStatus re-probes every 90s — so it
         can appear or vanish mid-session and this has to be re-queried, not
         cached at mount. */
      p.probeClock += dt;
      if (p.probeClock >= 0.25) {
        p.probeClock = 0;
        const fab = document.querySelector('.chat-fab');
        const bar = document.querySelector('.audio-bar');
        const fr = fab?.getBoundingClientRect();
        const br = bar?.getBoundingClientRect();
        p.fabX = fr ? fr.left + fr.width / 2 : null;
        p.leftKeepOut = br ? br.right + 24 : 0;
        p.rightKeepOut = fr ? fr.left - 24 : Number.POSITIVE_INFINITY;
      }

      const ground = groundY();

      switch (p.phase) {
        case 'peek':
          break;

        case 'falling': {
          p.vy = Math.min(p.vy + G * dt, VY_TERM);
          p.y += p.vy * dt;

          p.vx *= Math.exp(-AIR_DRAG * dt);
          p.swayAnchorX += p.vx * dt;
          p.swayPhase += SWAY_W * dt;

          /* The sine rides an anchor rather than x itself, so a throw's drift
             and the swing do not fight. Clamping pushes the anchor back, which
             makes him slide down a wall instead of buzzing against it. */
          const raw = p.swayAnchorX + SWAY_AMP * Math.sin(p.swayPhase);
          const cl = clamp(raw, MARGIN + halfW(), p.vw - MARGIN - halfW());
          if (cl !== raw) { p.swayAnchorX -= raw - cl; p.vx = 0; }
          p.x = cl;
          p.rot = TILT * Math.cos(p.swayPhase);

          if (p.y >= ground) {
            p.y = ground; p.vy = 0; p.rot = 0; p.facing = 1;
            enter('landing', LAND_S, 'land');
          }
          break;
        }

        case 'flying': {
          /* A throw, not a leaf: ballistic, and the sprite points along the
             velocity so he reads as travelling rather than drifting. */
          p.vy += G * dt;

          /* Into the hole, if he arrives at the left wall low enough and fast
             enough. Checked before the clamp, because the clamp is the wall. */
          const nx = p.x + p.vx * dt;
          const top = holeTop();
          if (
            nx <= MARGIN + halfW()
            && p.vx <= ESCAPE_VX
            && p.y >= top && p.y <= top + HOLE_H
          ) {
            p.x = nx;
            p.y += p.vy * dt;
            setEffect(pick(EFFECT_KEYS));
            sfxRef.current(SFX_WHOOSH, 2.0);
            /* Hold the line so a pose chop cannot talk over the exit. */
            p.sfxUntil = ts + WHOOSH_MS;
            enter('escaping', ESCAPE_S, 'fly');
            break;
          }

          p.x = clamp(nx, MARGIN + halfW(), p.vw - MARGIN - halfW());
          p.y += p.vy * dt;
          /* Tilt into the direction of travel. Two corrections on the raw
             angle: a floor under the horizontal speed, or a near-vertical drop
             puts him on his head at 90°; and a sign that follows `facing`,
             because `rotate(a) scaleX(-1)` mirrors the rotation too — without
             it a pet thrown to the left tilts its feet down instead of its
             head. */
          p.facing = p.vx < 0 ? -1 : 1;
          const ang = (Math.atan2(p.vy, Math.max(Math.abs(p.vx), 120)) * 180) / Math.PI;
          p.rot = p.facing * clamp(ang, -55, 55);

          if (p.y >= ground) {
            p.y = ground; p.vy = 0; p.vx = 0; p.rot = 0; p.facing = 1;
            enter('landing', LAND_S, 'land');
          }
          break;
        }

        case 'landing':
          p.stateClock += dt;
          if (p.stateClock >= p.stateDur) { enter('idle', rand(0.6, 1.2), 'idle'); }
          break;

        case 'walking': {
          const nx = clamp(p.x + WALK_SPEED * p.walkDir * dt,
            MARGIN + halfW(), p.vw - MARGIN - halfW());
          if (nx === p.x) { p.walkDir = (p.walkDir === 1 ? -1 : 1); p.facing = p.walkDir; }
          p.x = nx;

          p.walkClock += dt;
          if (p.walkClock >= WALK_STEP_S) {
            p.walkClock -= WALK_STEP_S;
            p.walkStep ^= 1;
            setFrame(p.walkStep ? 'walk_r' : 'walk_l');
          }
          p.stateClock += dt;
          if (p.stateClock >= p.stateDur) chooseNext();
          break;
        }

        case 'idle':
        case 'posing':
          p.stateClock += dt;
          if (p.stateClock >= p.stateDur) chooseNext();
          break;

        case 'escaping': {
          /* Through the wall and gone. No clamp — off-screen is the point. */
          p.vy += G * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.stateClock += dt;
          if (p.stateClock >= p.stateDur) resetToCorner();
          break;
        }

        case 'grabbed':
          break;
      }

      /* Point at the chat button. Horizontal distance only — he is always on
         the floor and the button is a fixed offset off the bottom, so the
         vertical gap is a constant and a euclidean test would be the same
         check wearing a square root. Every frame faces right and pose_2 points
         along the facing direction, so sign(dx) is the whole aiming logic. */
      if ((p.phase === 'idle' || p.phase === 'walking') && p.fabX !== null && ts >= p.fabCooldown) {
        const dx = p.fabX - p.x;
        if (Math.abs(dx) < NEAR_PX) {
          p.facing = dx > 0 ? 1 : -1;
          striking(ts, POINT_FRAME, POINT_S, true);
          p.fabCooldown = ts + FAB_COOLDOWN_MS;
        }
      }

      /* The overlay is placed as a sibling, not a child: inside the mirrored
         wrapper the katakana would render backwards whenever he faces left. */
      place();

      p.raf = requestAnimationFrame(step);
    };

    p.lastTs = performance.now();
    p.raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(p.raf);
      mq.removeEventListener('change', onMq);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVis);
      p.drag = null;
    };
  }, [enter, groundY, halfW, holeTop, place, resetToCorner, setFrame, striking]);

  /* ---------------------------------------------------------------------- *
   * Pointer. HTML5 drag is dead here — useImageGuard preventDefaults
   * `dragstart` on every <img> — so this is pointer capture, which also keeps
   * delivering moves after the pointer leaves the sprite's box.
   * ---------------------------------------------------------------------- */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = s.current;
    /* Left button only. A right- or middle-press must not start a grab, or the
       sprite would follow a menu-click around the page. */
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (p.phase === 'escaping') return;   // he has left; let him go
    e.preventDefault();
    /* Throws InvalidPointerId if the pointer is no longer active by the time
       this runs. Capture is an optimisation here — losing it costs a drag that
       stops tracking outside the sprite, not a broken pet. */
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* carry on uncaptured */
    }
    p.drag = {
      id: e.pointerId, sx: e.clientX, sy: e.clientY,
      ox: e.clientX - p.x, oy: e.clientY - p.y,
      grabbed: false, lt: performance.now(), lx: p.x, ly: p.y,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = s.current;
      const d = p.drag;
      if (!d || e.pointerId !== d.id) return;

      if (!d.grabbed) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) <= DRAG_THRESHOLD) return;
        d.grabbed = true;
        p.vx = 0; p.vy = 0; p.rot = DRAG_ROT; p.facing = 1;
        if (p.phase === 'peek') setFrame('drag');
        setPeeking(false);
        enter('grabbed', Infinity, 'drag');
      }

      p.x = clamp(e.clientX - d.ox, MARGIN + halfW(), p.vw - MARGIN - halfW());
      p.y = clamp(e.clientY - d.oy, -p.stand * 0.2, p.vh - 4);

      const now = performance.now();
      const dt = (now - d.lt) / 1000;
      if (dt > 0.004) {
        /* Smoothed: one last-frame delta is noisy enough to send a gentle
           release flying. */
        p.vx = 0.7 * p.vx + 0.3 * ((p.x - d.lx) / dt);
        p.vy = 0.7 * p.vy + 0.3 * ((p.y - d.ly) / dt);
        d.lt = now; d.lx = p.x; d.ly = p.y;
      }
    },
    [enter, halfW, setFrame],
  );

  /** Hover on a mouse, tap on a touchscreen. */
  const react = useCallback(
    (now: number) => {
      const p = s.current;
      if (p.phase === 'peek' || p.phase === 'grabbed'
        || p.phase === 'falling' || p.phase === 'flying') return;
      /* The clip length is the throttle — comboSfx refuses to retrigger over
         itself, so there is no second cooldown to keep in step with it. */
      if (now < p.sfxUntil) return;
      striking(now, pick(POSE_FRAMES), rand(1.2, 2), true);
    },
    [striking],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const p = s.current;
      const d = p.drag;
      p.drag = null;
      if (!d || e.pointerId !== d.id) return;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* never captured */
      }

      const now = performance.now();

      if (!d.grabbed) {
        /* A press that never travelled. From the corner this is the activation
           — and, being a real gesture, it is also what unlocks audio for every
           later hover. */
        if (p.phase === 'peek') {
          setPeeking(false);
          p.vx = 0; p.vy = 0; p.rot = 0;
          p.swayAnchorX = p.x; p.swayPhase = 0;
          /* Silent. The drop is the one moment the visitor did not ask for a
             noise — they poked a bag in the corner, not a sound button. The
             click still counts as the gesture that unlocks audio, so the first
             pose they trigger afterwards plays normally. */
          if (p.reduced) { p.y = groundY(); enter('landing', LAND_S, 'land'); }
          else enter('falling', Infinity, 'fall');
        } else {
          react(now);
        }
        return;
      }

      if (cancelled) { p.vx = 0; p.vy = 0; }
      p.vx = clamp(p.vx, -THROW_MAX, THROW_MAX);
      p.vy = clamp(p.vy, -THROW_MAX, THROW_MAX);
      p.swayAnchorX = p.x; p.swayPhase = 0; p.rot = 0;

      if (p.reduced) { p.y = groundY(); enter('landing', LAND_S, 'land'); return; }
      /* A deliberate throw flies; letting go of a stationary pet just drops it. */
      const thrown = Math.hypot(p.vx, p.vy) > 90;
      enter(thrown ? 'flying' : 'falling', Infinity, thrown ? 'fly' : 'fall');
    },
    [enter, groundY, react],
  );

  const onPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      /* Touch gets its reaction from the tap in endDrag instead — firing here
         too would double up on every tap. */
      if (e.pointerType !== 'mouse') return;
      react(performance.now());
    },
    [react],
  );

  return {
    wrapRef, fxRef, frame, effect, peeking, place, holeShown,
    holeStyle: { top: `calc(${HOLE_Y_FRAC * 100}% - ${HOLE_H / 2}px)`, height: HOLE_H },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, false),
      onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, true),
      onPointerEnter,
      /* No context menu on the pet. The frames are photos of Genova, and the
         rest of the site already refuses "Save image as" via useImageGuard —
         but that guard keys off the target being an <img>, and the pet's hit
         target is a <span> laid over one. So it has to be refused here too. */
      onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => e.preventDefault(),
    },
  };
}
