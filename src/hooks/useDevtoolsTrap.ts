import { useEffect } from 'react';

const REDIRECT_URL = 'https://www.youtube.com/watch?v=ntuH3q5gfo4';

type KeyLike = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

/**
 * Matches the original site's shortcut list. Keyed on `event.code` (the
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
    // View source, print, save
    (ctrlOrMeta && is('KeyU', 'KeyP', 'KeyS'))
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

    /*
     * The size gap only exists for *docked* panels. Devtools opened in a
     * separate window - or opened before this page loaded - leaves the
     * viewport untouched, which is how the trap could be walked past.
     *
     * This catches those: logging an object only formats it when a devtools
     * console is actually rendering the entry, so the getter fires exactly
     * when a panel is open. `console.table` keeps the noise out of the page.
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

    const check = () => {
      checkSize();
      checkConsole();
    };

    check();
    const id = window.setInterval(check, 1000);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', checkSize);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', checkSize);
    };
  }, [enabled]);
}
