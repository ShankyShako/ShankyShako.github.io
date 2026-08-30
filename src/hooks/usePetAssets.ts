import { useEffect, useState } from 'react';

type State = 'loading' | 'ready' | 'unavailable';

/**
 * Decodes every pet sprite up front and reports whether the whole set arrived.
 *
 * All-or-nothing on purpose: a pet missing only `walk_r` walks as a statue, and
 * a missing file rendered through an <img> is a broken-image glyph parked in the
 * corner of the page. Gating on the complete set means the easter egg either
 * works or was never there, which is the same contract the music keeps.
 *
 * Deferred to idle time — this is roughly 660KB for something most visitors
 * never trigger, and it has no business competing with the page's own images on
 * first paint. By the time anyone clicks the peek it is decoded, so the first
 * frame swap does not flash.
 */
export function usePetAssets(urls: readonly string[]) {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let alive = true;

    const load = (url: string) =>
      new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => (img.naturalWidth > 0 ? resolve() : reject(new Error(url)));
        img.onerror = () => reject(new Error(url));
        img.src = url;
      });

    const kick = () => {
      if (!alive) return;
      Promise.all(urls.map(load))
        .then(() => alive && setState('ready'))
        .catch(() => alive && setState('unavailable'));
    };

    /* `'requestIdleCallback' in window` would narrow window to never in the
       else branch — it is in lib.dom, so TypeScript treats the check as always
       true. Test the value instead; Safari genuinely lacks it. */
    const ric = typeof window.requestIdleCallback === 'function';
    const idle = ric
      ? window.requestIdleCallback(kick, { timeout: 2000 })
      : window.setTimeout(kick, 500);

    return () => {
      alive = false;
      if (ric) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, [urls]);

  return state;
}
