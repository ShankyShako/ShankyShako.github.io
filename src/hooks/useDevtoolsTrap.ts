import { useEffect } from 'react';

const REDIRECT_URL = 'https://www.youtube.com/watch?v=ntuH3q5gfo4';

/**
 * The original site's devtools deterrent, carried over. It is decorative —
 * anyone determined can still read the bundle — so it only runs in production
 * builds, keeping `npm run dev` usable.
 */
export function useDevtoolsTrap(enabled = import.meta.env.PROD) {
  useEffect(() => {
    if (!enabled) return;

    let tripped = false;
    const trip = () => {
      if (tripped) return;
      tripped = true;
      window.location.href = REDIRECT_URL;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const inspector =
        e.key === 'F12' ||
        (ctrlOrMeta && e.shiftKey && ['i', 'c', 'j'].includes(k)) ||
        (e.metaKey && e.altKey && ['i', 'c', 'j'].includes(k)) ||
        (ctrlOrMeta && ['u', 'p', 's'].includes(k));

      if (inspector) {
        e.preventDefault();
        trip();
      }
    };

    /* Viewport/window gap widens sharply when a docked panel opens. */
    const checkSize = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        trip();
      }
    };

    const id = window.setInterval(checkSize, 1000);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', checkSize);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', checkSize);
    };
  }, [enabled]);
}
