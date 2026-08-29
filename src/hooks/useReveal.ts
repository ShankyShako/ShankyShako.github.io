import { useLayoutEffect, useRef } from 'react';

/**
 * Adds `.is-visible` when an element scrolls into view, driving the staggered
 * fade-up.
 *
 * Anything already on screen at mount is revealed synchronously in a layout
 * effect, before the browser paints. An IntersectionObserver callback only
 * fires *after* the first frame, so routing to a page whose whole content sits
 * above the fold used to paint an empty page for a beat and then fade the
 * content in — which is not a reveal, it is a loading state pretending to be
 * one. The observer now only ever handles what you actually scroll to.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onScreen = el.getBoundingClientRect().top < window.innerHeight;

    if (reduced || onScreen || !('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          obs.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}
