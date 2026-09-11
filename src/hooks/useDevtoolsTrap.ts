import { useEffect } from 'react';

const REDIRECT_URL = 'https://www.youtube.com/watch?v=ntuH3q5gfo4';

type KeyLike = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * Inspector, console and view-source shortcuts. Keyed on `event.code` (the
 * physical key) rather than `event.key`: on macOS, Option+I emits the dead key
 * "ˆ", not "i", so a character-based check would miss every Cmd+Option combo.
 * Print (Cmd+P) and save (Cmd+S) stay allowed; saving the resume is a normal
 * thing for a recruiter to do.
 */
export function isInspectorShortcut(e: KeyLike): boolean {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  const is = (...codes: string[]) => codes.includes(e.code);

  return (
    e.code === 'F12' ||
    (ctrlOrMeta && e.shiftKey && is('KeyI', 'KeyC', 'KeyJ')) ||
    (e.metaKey && e.altKey && is('KeyI', 'KeyC', 'KeyJ')) ||
    (ctrlOrMeta && is('KeyU'))
  );
}

/**
 * Leaves visitors what a recruiter needs: reading, clicking, selecting and
 * copying text, printing and saving. Anything aimed at the developer tools
 * sends them off-site. Decorative rather than security, so it only runs in
 * production builds and `npm run dev` stays usable.
 *
 * - Shortcuts for the inspector, console and view-source redirect.
 * - The right-click menu is disabled; that's where "Inspect Element" lives.
 * - An open panel redirects, however it was opened. A `debugger` statement
 *   does nothing until developer tools are attached, then pauses the page, so
 *   a long gap across one means a panel is open. Page zoom can't trip it, which
 *   is what killed the old window-size comparison.
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
      if (isInspectorShortcut(e)) {
        e.preventDefault();
        trip();
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const checkOpen = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      if (performance.now() - start > 100) trip();
    };

    checkOpen();
    const id = window.setInterval(checkOpen, 1000);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [enabled]);
}
