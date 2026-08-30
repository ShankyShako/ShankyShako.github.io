import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Mode } from './ThemeContext';

const PLAYLISTS: Record<Mode, string[]> = {
  light: ['/audio/light1.mp3', '/audio/light2.mp3'],
  elmo: ['/audio/elmo1.mp3', '/audio/elmo2.mp3'],
};

const FADE_MS = 700;
const FADE_SEC = FADE_MS / 1000;

type AudioValue = {
  started: boolean;
  muted: boolean;
  volume: number;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  /** Called by the first Elmo interaction — reveals the bar and starts playback. */
  activate: () => void;
  /** Switch playlists, picking a random starting track in the new mode. */
  setMode: (mode: Mode) => void;
  /**
   * Fire-and-forget one-shot, for UI sounds. Deliberately independent of the
   * music: it never consults `started`, so the desktop pet can chirp without
   * revealing the audio bar or starting a playlist that belongs to a different
   * easter egg. It does honour mute and the volume slider, because once that
   * bar is on screen it is the only audio control the visitor has.
   */
  playSfx: (url: string, gain?: number) => void;
  deckRefs: [React.RefObject<HTMLAudioElement | null>, React.RefObject<HTMLAudioElement | null>];
};

const AudioCtx = createContext<AudioValue | null>(null);

/**
 * Two <audio> decks that crossfade into each other. The decks live in the app
 * shell rather than any route, so navigation never interrupts playback.
 * Music stays silent until `activate()` — triggered by the profile-photo
 * easter egg — and then runs for the rest of the session.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const deckA = useRef<HTMLAudioElement | null>(null);
  const deckB = useRef<HTMLAudioElement | null>(null);

  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.2);

  /* Refs mirror state so the rAF fade loop and timeupdate handler read fresh
     values without re-subscribing on every render. */
  const activeDeck = useRef(0);
  const trackIndex = useRef(0);
  const modeRef = useRef<Mode>('light');
  const startedRef = useRef(false);
  const mutedRef = useRef(false);
  const volumeRef = useRef(0.2);
  const fadeRAF = useRef<Map<HTMLAudioElement, number>>(new Map());
  const advancing = useRef<Set<HTMLAudioElement>>(new Set());

  const fadeTo = useCallback(
    (audio: HTMLAudioElement | null, target: number, ms: number, pauseAtZero = false) => {
      if (!audio) return;
      const existing = fadeRAF.current.get(audio);
      if (existing) cancelAnimationFrame(existing);

      const from = audio.volume;
      const t0 = performance.now();

      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        audio.volume = Math.max(0, Math.min(1, from + (target - from) * p));
        if (p < 1) {
          fadeRAF.current.set(audio, requestAnimationFrame(step));
        } else {
          fadeRAF.current.delete(audio);
          if (pauseAtZero && target === 0) audio.pause();
        }
      };
      step(t0);
    },
    [],
  );

  const crossfadeTo = useCallback(
    (url: string) => {
      const decks = [deckA.current, deckB.current];
      const incoming = decks[1 - activeDeck.current];
      const outgoing = decks[activeDeck.current];
      if (!incoming) return;

      incoming.src = url;
      try { incoming.currentTime = 0; } catch { /* not seekable yet */ }
      incoming.volume = 0;
      advancing.current.delete(incoming);
      void incoming.play().catch(() => { /* missing file or autoplay block */ });

      fadeTo(incoming, volumeRef.current, FADE_MS);
      fadeTo(outgoing, 0, FADE_MS, true);
      activeDeck.current = 1 - activeDeck.current;
    },
    [fadeTo],
  );

  const playTrack = useCallback(() => {
    if (!startedRef.current || mutedRef.current) return;
    crossfadeTo(PLAYLISTS[modeRef.current][trackIndex.current]);
  }, [crossfadeTo]);

  const advance = useCallback(() => {
    const list = PLAYLISTS[modeRef.current];
    trackIndex.current = (trackIndex.current + 1) % list.length;
    playTrack();
  }, [playTrack]);

  const setMode = useCallback(
    (mode: Mode) => {
      modeRef.current = mode;
      trackIndex.current = Math.floor(Math.random() * PLAYLISTS[mode].length);
      playTrack();
    },
    [playTrack],
  );

  /* One pool per URL. Three deep so a rapid combo does not cut itself off,
     and pooled rather than per-call because Safari holds decoded buffers for
     orphaned media elements far longer than you would like. These elements are
     never handed to fadeTo/crossfadeTo — those only ever see the two decks —
     so a one-shot cannot interrupt the music. */
  const sfxPool = useRef<Map<string, HTMLAudioElement[]>>(new Map());

  const playSfx = useCallback((url: string, gain = 1) => {
    if (mutedRef.current) return;

    let pool = sfxPool.current.get(url);
    if (!pool) {
      pool = Array.from({ length: 3 }, () => {
        const a = new Audio(url);
        a.preload = 'auto';
        return a;
      });
      sfxPool.current.set(url, pool);
    }

    const a = pool.find((el) => el.paused || el.ended) ?? pool[0];
    /* Multiplied, not floored: a slider at zero has to be truly silent. */
    a.volume = Math.max(0, Math.min(1, volumeRef.current * gain));
    try {
      a.currentTime = 0;
    } catch {
      /* not seekable until enough has buffered */
    }
    void a.play().catch(() => {
      /* missing file, or a browser still withholding autoplay — a silent
         easter egg is the intended degradation either way */
    });
  }, []);

  useEffect(() => {
    const pools = sfxPool.current;
    return () => {
      pools.forEach((pool) => pool.forEach((a) => { a.pause(); a.src = ''; }));
      pools.clear();
    };
  }, []);

  const activate = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
    setVolumeState(v);
    const decks = [deckA.current, deckB.current];
    const active = decks[activeDeck.current];
    if (startedRef.current && !mutedRef.current && active) active.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      fadeTo(deckA.current, 0, 300, true);
      fadeTo(deckB.current, 0, 300, true);
    } else if (startedRef.current) {
      playTrack();
    }
  }, [fadeTo, playTrack]);

  /* Crossfade into the next track just before the current one ends. */
  useEffect(() => {
    const decks = [deckA.current, deckB.current];
    const cleanups: Array<() => void> = [];

    decks.forEach((d, i) => {
      if (!d) return;
      d.volume = 0;

      const onTime = () => {
        if (i !== activeDeck.current || mutedRef.current || !startedRef.current) return;
        if (!d.duration || Number.isNaN(d.duration)) return;
        if (d.duration - d.currentTime <= FADE_SEC && !advancing.current.has(d)) {
          advancing.current.add(d);
          advance();
        }
      };
      const onEnded = () => {
        if (i === activeDeck.current && startedRef.current && !mutedRef.current) advance();
      };

      d.addEventListener('timeupdate', onTime);
      d.addEventListener('ended', onEnded);
      cleanups.push(() => {
        d.removeEventListener('timeupdate', onTime);
        d.removeEventListener('ended', onEnded);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [advance]);

  const value = useMemo(
    () => ({
      started, muted, volume, setVolume, toggleMute, activate, setMode, playSfx,
      deckRefs: [deckA, deckB] as AudioValue['deckRefs'],
    }),
    [started, muted, volume, setVolume, toggleMute, activate, setMode, playSfx],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
}
