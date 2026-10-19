import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type Phase = 'idle' | 'playing' | 'done';

const reducedNow = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays a demo once. `idle -> playing` when the element is 40% on screen (or
 * `startAfterMs` after mount for the hero, which is already in view), `playing
 * -> done` when the demo calls `finish()`. Under Reduce Motion `phase` is
 * `'done'` from the first render and nothing ever animates. `replay()` re-runs
 * the script; the demo watches `run` to restart its timers.
 */
export function usePlayOnce(
  ref: RefObject<HTMLElement | null>,
  options: { startAfterMs?: number } = {},
) {
  const { startAfterMs } = options;
  const [reduced] = useState(reducedNow);
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'idle');
  const [run, setRun] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced || started.current) return;
    const start = () => {
      started.current = true;
      setPhase('playing');
    };

    if (startAfterMs !== undefined) {
      const t = window.setTimeout(start, startAfterMs);
      return () => window.clearTimeout(t);
    }

    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      start();
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          start();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced, ref, startAfterMs]);

  const finish = useCallback(() => setPhase('done'), []);
  const replay = useCallback(() => {
    setRun((r) => r + 1);
    setPhase('playing');
  }, []);

  return { phase, reduced, run, finish, replay };
}
