import { useEffect } from 'react';

const REDIRECT_URL = 'https://www.youtube.com/watch?v=ntuH3q5gfo4';

type KeyLike = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * The original site's shortcut list, minus print and save. Keyed on `event.code` (the
 * physical key) rather than `event.key` (the character produced): on macOS,
 * Option+I emits the dead key "ˆ", not "i", so a character-based check would
 * miss every Cmd+Option combination.
 */
export function isInspectorShortcut(e: KeyLike): boolean {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  const is = (...codes: string[]) => codes.includes(e.code);

  return (
    e.code === 'F12' ||
    // Inspect / element picker / console
    (ctrlOrMeta && e.shiftKey && is('KeyI', 'KeyC', 'KeyJ')) ||
    (e.metaKey && e.altKey && is('KeyI', 'KeyC', 'KeyJ')) ||
    /* View source. Print (Cmd+P) and save (Cmd+S) are deliberately not trapped:
       printing or saving the resume page is the single most likely thing a
       visitor does here, and catching those shortcuts sent them off-site. */
    (ctrlOrMeta && is('KeyU'))
  );
}

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
      if (isInspectorShortcut(e)) {
        e.preventDefault();
        trip();
      }
    };

    /*
     * There used to be a second check here comparing `outerWidth/Height` to
     * `innerWidth/Height`, on the theory that a docked panel widens the gap.
     * It also widens under browser page zoom, which leaves `outerWidth` alone
     * while shrinking `innerWidth` — so a visitor reading the site at 150%
     * with no devtools open would trip it and get thrown off the page. Zooming
     * in to read something is not the behaviour this is meant to catch, so the
     * heuristic is gone.
     *
     * What remains detects an open panel directly, docked or undocked, and
     * whether or not it was open before this page loaded: logging an object
     * only formats it when a console is actually rendering the entry, so the
     * getter fires exactly when a panel is open. `console.table` keeps the
     * noise out of the page.
     */
    const probe = document.createElement('pre');
    let seen = false;
    Object.defineProperty(probe, 'id', {
      get() {
        seen = true;
        return '';
      },
    });

    const checkConsole = () => {
      seen = false;
      console.table([probe]);
      console.clear();
      if (seen) trip();
    };

    checkConsole();
    const id = window.setInterval(checkConsole, 1000);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled]);
}
