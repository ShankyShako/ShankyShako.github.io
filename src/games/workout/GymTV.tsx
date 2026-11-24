/* The gym TV, hung in the top-right corner: the owner's Flipnote tapes
   from YouTube, one more unlocked per meet. Flat UI only. On a big stage it plays the tapes
   (muted, YouTube IFrame API); anywhere else, or if playback doesn't start,
   it is a thumbnail that links out. Taps on it never count as reps. */
import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { TAPES } from './engine';

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
};
type YTApi = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; ENDED: number };
};

let apiPromise: Promise<YTApi> | null = null;
function loadApi(): Promise<YTApi> {
  const w = window as unknown as { YT?: YTApi & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(w.YT as YTApi);
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        apiPromise = null;
        reject(new Error('YouTube API blocked'));
      };
      document.head.appendChild(tag);
    });
  }
  return apiPromise;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = () => (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/* One small tile of grey snow, drawn once and scrolled in steps by CSS. */
let snow = '';
function snowTile(): string {
  if (snow || typeof document === 'undefined') return snow;
  try {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 54;
    const g = c.getContext('2d');
    if (!g) return '';
    const img = g.createImageData(96, 54);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 40 + Math.random() * 60 : 150 + Math.random() * 105;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    snow = `url(${c.toDataURL()})`;
  } catch {
    snow = '';
  }
  return snow;
}
/** Shortest burst of static on a channel change, ms. */
const FLIP_MS = 550;
const stop = (e: SyntheticEvent) => e.stopPropagation();

type Props = {
  /** How many tapes are on the shelf. */
  unlocked: number;
  /** The first rep has happened: only then is a player created. */
  interactive: boolean;
  /** A meet is open: the tape pauses. */
  paused: boolean;
};

export function GymTV({ unlocked, interactive, paused }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const idxRef = useRef(0);
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;
  const [idx, setIdx] = useState(0);
  const [big, setBig] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [thumbOk, setThumbOk] = useState(false);
  const [thumbErr, setThumbErr] = useState(false);
  const [flip, setFlip] = useState(false);
  const flipTimer = useRef(0);

  const live = big && !failed;
  const go = (n: number) => {
    idxRef.current = n;
    setIdx(n);
    setThumbErr(false);
    /* A burst of static, as if the set is changing channel. */
    setFlip(true);
    window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => setFlip(false), FLIP_MS);
  };
  useEffect(() => () => window.clearTimeout(flipTimer.current), []);

  /* Live mode needs a big stage (the scene's own container). */
  useEffect(() => {
    const host = wrap.current?.closest<HTMLElement>('.wk-root');
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBig(host.clientWidth >= 1180 && host.clientHeight >= 640));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  /* The live player: made after the first rep, gone when the stage shrinks. */
  useEffect(() => {
    if (!live || !interactive) return;
    if (reducedMotion() || saveData()) {
      setFailed(true);
      return;
    }
    let dead = false;
    const el = mount.current;
    const timer = window.setTimeout(() => !dead && setFailed(true), 8000);
    const next = () => {
      const n = (idxRef.current + 1) % Math.max(1, unlockedRef.current);
      go(n);
      try {
        player.current?.loadVideoById(TAPES[n]);
      } catch {
        setFailed(true);
      }
    };
    loadApi()
      .then((YT) => {
        if (dead || !el) return;
        const slot = document.createElement('div');
        el.appendChild(slot);
        player.current = new YT.Player(slot, {
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          videoId: TAPES[Math.min(idxRef.current, unlockedRef.current - 1)],
          playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              try {
                const f = e.target.getIframe();
                f.tabIndex = -1;
                f.setAttribute('aria-hidden', 'true');
                e.target.mute();
                e.target.playVideo();
              } catch {
                /* the fallback timer covers it */
              }
            },
            onStateChange: (e: { data: number }) => {
              if (e.data === YT.PlayerState.PLAYING) {
                window.clearTimeout(timer);
                setPlaying(true);
              } else if (e.data === YT.PlayerState.ENDED) {
                setPlaying(false);
                next();
              }
            },
            onError: next,
          },
        });
      })
      .catch(() => !dead && setFailed(true));
    return () => {
      dead = true;
      window.clearTimeout(timer);
      try {
        player.current?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
      if (el) el.textContent = '';
      setPlaying(false);
    };
  }, [live, interactive]);

  useEffect(() => {
    const p = player.current;
    if (!p || !playing) return;
    try {
      if (paused || hidden) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* ignore */
    }
  }, [paused, hidden, playing]);

  /* Compact mode: the thumbnail rotates through the unlocked tapes. */
  useEffect(() => {
    if (live || reducedMotion() || unlocked < 2 || hidden) return;
    const id = window.setInterval(() => {
      setThumbOk(false);
      go((idxRef.current + 1) % unlockedRef.current);
    }, 8000);
    return () => window.clearInterval(id);
  }, [live, unlocked, hidden]);

  const cur = Math.min(idx, unlocked - 1);
  /* Static shows while a tape is loading (only once the set is switched on)
     and for a moment on every channel change. */
  const tuning = flip || (live ? interactive && !playing : !thumbOk && !thumbErr);
  const id = TAPES[cur];
  const screen = (
    <div className="wk-tv-screen">
      <span className="wk-tv-label" aria-hidden="true">
        GYM TV
      </span>
      <span className={`wk-tv-static${tuning ? ' is-on' : ''}`} style={{ backgroundImage: snowTile() || undefined }} aria-hidden="true" />
      {live ? (
        <div className={`wk-tv-player${playing ? ' is-on' : ''}`} ref={mount} />
      ) : (
        <img
          key={id}
          className={`wk-tv-thumb${thumbOk ? ' is-on' : ''}`}
          src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
          alt=""
          draggable={false}
          onLoad={() => setThumbOk(true)}
          onError={() => setThumbErr(true)}
        />
      )}
    </div>
  );
  const name = `Gym TV, tape ${cur + 1} of ${TAPES.length}. Watch on YouTube (opens a new tab)`;

  /* Hung from the ceiling in the top-right corner and turned toward the
     room, so it reads as the gym's TV rather than a panel for the player.
     The YouTube link covers the set; its chip shows on hover or focus. */
  return (
    <div
      ref={wrap}
      className={`wk-tv ${live ? 'is-live' : 'is-compact'}${playing || (!live && thumbOk) ? ' is-on' : ''}${tuning ? ' is-tuning' : ''}`}
      onPointerDown={stop}
      onKeyDown={stop}
    >
      <span className="wk-tv-mount" aria-hidden="true" />
      <span className="wk-tv-glow" aria-hidden="true" />
      <div className="wk-tv-set">
        <div className="wk-tv-bezel">{screen}</div>
        <a className="wk-tv-link" href={watchUrl(id)} target="_blank" rel="noopener noreferrer" aria-label={name}>
          <span className="wk-tv-chip" aria-hidden="true">
            ▶<span className="wk-tv-chip-long"> Watch on YouTube</span>
          </span>
        </a>
      </div>
    </div>
  );
}
