import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Maps scroll position to which card is face-up on the pile.
 *
 * Deliberately not a wheel handler. Nothing here calls preventDefault, so the
 * scrollbar, Cmd+F, Page Up/Down, Home/End and trackpad momentum all keep
 * working — the deck is a tall block with a sticky stage inside it, and the
 * only thing this reads is where the page already is.
 *
 * Index 0 is the newest role, face-up on a complete pile; scrolling down lifts
 * cards off to reveal older ones underneath, so the index walks forward through
 * the array exactly as it is written.
 *
 * Nothing keys off a card count. Step comes from --deck-step so the sensitivity
 * lives in CSS next to the layout it controls.
 */
export function useDeck(count: number) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);

  /* Scroll fires far faster than paint. Everything mutable lives here so a
     scroll frame costs a ref write, and React only hears about level changes. */
  const s = useRef({ index: 0, frame: 0, step: 120 });

  const readStep = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return 120;
    const raw = getComputedStyle(el).getPropertyValue('--deck-step');
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 120;
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    s.current.step = readStep();

    const measure = () => {
      const { step } = s.current;
      const scrolled = -el.getBoundingClientRect().top;
      const raw = scrolled / step;

      /* A deadzone either side of the boundary. Without it a pixel of scroll
         drift at a threshold retriggers the slam over and over. */
      const from = s.current.index;
      let next = from;
      if (raw > from + 0.6) next = Math.ceil(raw - 0.4);
      else if (raw < from - 0.6) next = Math.floor(raw + 0.4);

      next = Math.max(0, Math.min(count - 1, next));
      if (next !== from) {
        s.current.index = next;
        setIndex(next);
      }
    };

    const onScroll = () => {
      if (s.current.frame) return;
      s.current.frame = requestAnimationFrame(() => {
        s.current.frame = 0;
        measure();
      });
    };

    /* rAF-gated like the scroll handler: dragging a window edge fires at ~60Hz
       and each one costs a getComputedStyle plus a rect. */
    let resizeFrame = 0;
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        s.current.step = readStep();
        measure();
      });
    };

    /* rAF does not run while the tab is hidden, so scrolls that happen either
       side of a tab switch can leave the pile showing the wrong level. Catch up
       on the way back in — but on a later frame, not this one. Changing the
       level in the same frame the tab becomes visible means the browser has no
       previous painted value to interpolate from, so the cracks and the pile
       snap to their new state instead of travelling there. */
    let wakeFrame = 0;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      wakeFrame = requestAnimationFrame(() => {
        wakeFrame = requestAnimationFrame(measure);
      });
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(s.current.frame);
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(wakeFrame);
      s.current.frame = 0;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [count, readStep]);

  /** Rail jumps move the page, so the deck follows for free. */
  const goTo = useCallback(
    (i: number) => {
      const el = sectionRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY + i * s.current.step;
      window.scrollTo({ top, behavior: 'smooth' });
    },
    [],
  );

  return { sectionRef, index, goTo };
}
