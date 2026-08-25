import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const FLASH_MS = 2400;

/**
 * Scrolls to `#anchor` and flashes the card it lands on.
 *
 * The chat bot links straight at a specific role or project, and dropping
 * someone mid-page with no indication of which card they were sent to is a
 * "guess where it is" experience. The flash says *this one*.
 *
 * Retries across a few frames because the target route may still be mounting
 * when the hash changes.
 */
export function useHashHighlight() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const id = decodeURIComponent(hash.slice(1));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let frame = 0;
    let timer = 0;
    let tries = 0;

    const attempt = () => {
      const el = document.getElementById(id);
      if (!el) {
        /* ~20 frames is a third of a second: enough for a route swap, short
           enough that a genuinely missing anchor costs nothing. */
        if (tries++ < 20) frame = requestAnimationFrame(attempt);
        return;
      }

      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      el.classList.add('is-target');
      timer = window.setTimeout(() => el.classList.remove('is-target'), FLASH_MS);
    };

    attempt();

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.getElementById(id)?.classList.remove('is-target');
    };
  }, [hash, pathname]);
}
