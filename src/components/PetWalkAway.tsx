import { useEffect, useRef, useState } from 'react';

import { bump } from '../lib/stats';
import { WALK_AWAY, WALK_AWAY_SRC } from './petFrames';

/** How long he stands with his back turned before he sets off. */
const HOLD_MS = 900;
/**
 * How long the fade takes, and how far before the end of the clip it starts.
 * He's still about a third of his height on the last frame, so the clip
 * ending doesn't mean he's gone.
 */
const FADE_MS = 700;
/** If the clip hasn't shown a frame by now, give up on it. */
const LOAD_TIMEOUT_MS = 5000;
/**
 * Once he's walking, the longest the clip may sit without advancing on a
 * visible page before we call it over. A network stall doesn't fire `error`,
 * and WebKit can pause a backgrounded video and never resume it. He can't be
 * clicked while this plays, so a frozen frame must not be able to stay up.
 */
const STALL_MS = 3000;

/**
 * WebKit can't draw VP9's alpha channel and plays the webm on a black box, so
 * it gets the same clip as HEVC with alpha. The choice is made here, not with
 * <source> order, because Chromium on some platforms accepts hvc1 and then
 * drops the alpha. Every browser on iOS is WebKit whatever it calls itself,
 * and an iPad requesting the desktop site reports itself as a Mac. On macOS
 * the test is AppleWebKit rather than Safari, because apps embedding WebKit
 * often leave `Safari/` out of the UA string.
 */
function isWebKit() {
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox)\//.test(ua);
}

type Props = {
  /** How tall he stands, in CSS px. The clip is scaled to match the sprites. */
  stand: number;
  /** The first frame is up, so the sprite underneath can go. */
  onShown: () => void;
  /** He walked off and faded out. */
  onDone: () => void;
  /** The clip wouldn't load or play. */
  onFail: () => void;
};

/**
 * The rare exit: he turns his back on the page and walks off into the distance.
 *
 * It sits inside the pet wrapper, so the loop's transform places it like any
 * other frame. The WALK_AWAY numbers put the feet from the clip's first frame
 * on the wrapper's origin, at standing height. The clip only loads when the
 * roll comes up, so visitors who never see it never download it.
 *
 * Three beats: frame 0 held (the look back), the walk, then a fade over the
 * last part of the clip. Either way it ends, the engine is told exactly once.
 */
export function PetWalkAway({ stand, onShown, onDone, onFail }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);
  const [fading, setFading] = useState(false);

  /* These callbacks get new identities on every parent render. The effect
     must not restart the clip because of that. */
  const cb = useRef({ onShown, onDone, onFail });
  cb.current = { onShown, onDone, onFail };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    let over = false;
    let started = false;  // first frame is up
    let walking = false;  // the real play(), after the hold, has begun
    let fadeAt = 0;
    let lastT = -1;
    let lastMove = 0;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const finish = (how: 'onDone' | 'onFail') => {
      if (over) return;
      over = true;
      cb.current[how]();
    };
    const fade = () => {
      if (fadeAt) return;
      fadeAt = performance.now();
      setFading(true);
    };

    const onLoaded = () => {
      if (started || over) return;
      started = true;
      /* Undo the priming play() below and go back to frame 0 for the look back. */
      v.pause();
      v.currentTime = 0;
      setShown(true);
      cb.current.onShown();
      later(() => {
        if (over) return;
        v.play().then(
          () => {
            if (over) return;
            walking = true;
            lastMove = performance.now();
            bump('leave');
          },
          () => finish('onFail'),
        );
      }, HOLD_MS);
    };

    /* Timed off the clip's own clock, not a timer started at play(). A
       background tab pauses the video but not setTimeout, so a timer would
       fade him out mid-stride. */
    const onTime = () => {
      if (v.duration - v.currentTime <= FADE_MS / 1000) fade();
    };

    /* timeupdate only fires a few times a second, so the fade may have
       started late or not at all. The last frame stays painted after `ended`,
       so let the rest of the fade finish over it. */
    const onEnded = () => {
      fade();
      later(() => finish('onDone'), Math.max(0, FADE_MS - (performance.now() - fadeAt)));
    };

    const onError = () => finish('onFail');

    /* Checks the clip is still moving. Paused behind our back (WebKit does
       that to a backgrounded page) gets one nudge back into play. Stuck for
       STALL_MS on a visible page means he left early: fade him out and hand
       the corner back, the same as a normal ending. Resuming the idle sprite
       from half-way into the distance would look like a glitch. */
    const watch = window.setInterval(() => {
      if (!walking || over || v.ended) return;
      const now = performance.now();
      if (document.visibilityState !== 'visible') { lastMove = now; return; }
      if (v.currentTime !== lastT) { lastT = v.currentTime; lastMove = now; return; }
      if (v.paused) v.play().catch(() => {});
      if (now - lastMove > STALL_MS) {
        walking = false;
        fade();
        later(() => finish('onDone'), FADE_MS);
      }
    }, 500);

    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    v.addEventListener('error', onError);
    later(() => { if (!started) finish('onFail'); }, LOAD_TIMEOUT_MS);

    /* Set as properties here rather than in JSX. Autoplay policy checks the
       `muted` property, which React doesn't reliably set, and cleanup strips
       `src`, which a StrictMode re-run needs to put back. */
    v.muted = true;
    v.src = isWebKit() ? WALK_AWAY_SRC.mov : WALK_AWAY_SRC.webm;

    /* iOS ignores `preload` and fetches nothing past the metadata until play()
       is called, so without this `loadeddata` never arrives. onLoaded pauses it
       straight back on frame 0, which rejects this promise with AbortError, as
       expected. A NotAllowedError means autoplay is refused outright (Low Power
       Mode refuses even muted video), so the real play() would fail too. Give
       up now instead of freezing him for the whole load timeout. */
    v.play().catch((e: unknown) => {
      if (!started && e instanceof DOMException && e.name === 'NotAllowedError') finish('onFail');
    });

    return () => {
      over = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(watch);
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onError);
      /* Releases the decoder. Just unmounting can leave it alive until GC. */
      v.pause();
      v.removeAttribute('src');
      v.load();
    };
  }, []);

  const { w, h, bh, ax, ay } = WALK_AWAY;
  const k = stand / bh;

  return (
    <video
      ref={ref}
      className={`pet-video${shown ? ' is-shown' : ''}${fading ? ' is-fading' : ''}`}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden="true"
      style={{
        width: w * k,
        height: h * k,
        left: -ax * k,
        top: -ay * k,
        /* Appears instantly, so it replaces the sprite in a single frame, then
           fades out slowly. */
        transitionDuration: fading ? `${FADE_MS}ms` : '0ms',
      }}
    />
  );
}
