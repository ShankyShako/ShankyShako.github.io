import { useLayoutEffect, useState } from 'react';

/** Below this the stage has no room to show a pile and a rail at once. */
const MIN_WIDTH = 900;

const QUERIES = [
  `(min-width: ${MIN_WIDTH}px)`,
  '(pointer: fine)',
  '(prefers-reduced-motion: reduce)',
] as const;

function check() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const [wide, fine, reduced] = QUERIES.map((q) => window.matchMedia(q).matches);
  return wide && fine && !reduced;
}

/**
 * Whether this visitor gets the deck instead of the timeline.
 *
 * Computed in the state initialiser rather than an effect, so the first paint
 * is already the right one — the same reasoning as useReveal. Rendering the
 * timeline and swapping it for the deck a frame later is a flash of the wrong
 * layout on every visit.
 *
 * All three conditions are live: dragging the window under 900px or flipping
 * reduced motion in System Settings swaps the renderer without a reload.
 */
export function useDeckEligible() {
  const [eligible, setEligible] = useState(check);

  useLayoutEffect(() => {
    if (!window.matchMedia) return;
    const lists = QUERIES.map((q) => window.matchMedia(q));
    const onChange = () => setEligible(check());
    lists.forEach((l) => l.addEventListener('change', onChange));
    onChange();
    return () => lists.forEach((l) => l.removeEventListener('change', onChange));
  }, []);

  return eligible;
}
