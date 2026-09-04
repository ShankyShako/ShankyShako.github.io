import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { useTheme } from '../context/ThemeContext';

/**
 * Launches the paper plane out of a button.
 *
 * The engine is plane-send.js, vendored verbatim in public/ and loaded as a
 * global. It was written for a corner chat bubble that grows a contact card,
 * and only the tail of that sequence is wanted here: `send()` folds the card
 * away, unfolds a circle into paper at the bubble's centre, and climbs the
 * plane out through the top edge. So this passes it two inert proxies —
 * `#planeOrigin`, parked inside the button, is the "bubble" it launches from;
 * `#planeCardProxy` is a 1x1 box that satisfies the card it insists on
 * measuring. Both are visibility:hidden and nothing else on the page moves.
 *
 * Reduced motion needs no branch here: send() checks the media query itself
 * and skips straight to its own cleanup.
 */
export function usePlaneSend(button: RefObject<HTMLButtonElement | null>) {
  const engine = useRef<PlaneSendEngine | null>(null);
  const { elmo } = useTheme();

  useEffect(() => {
    const btn = button.current;
    if (!btn || !window.PlaneSend) return;

    /* The accent MUST be the origin's real background colour, or the swap from
       circle to paper flickers. Read it off the element rather than repeating
       the token, and re-init on a theme flip — the trail's stroke is baked into
       the DOM when the engine builds its layers and ignores later changes. */
    const accent = getComputedStyle(btn).backgroundColor;

    const made = window.PlaneSend.init({
      // This file owns the submit handler. Letting the engine bind anything of
      // its own is how one click launches two planes.
      bindTriggers: false,
      bubble: '#planeOrigin',
      card: '#planeCardProxy',
      // Deliberately NOT '#contact-send'. That button is a real submit that can
      // fail validation or the network; only a 2xx earns the flight, so the
      // success branch calls launch() instead.
      sendButton: null,
      closeButton: null,
      accent,
      trailColor: accent,
      exitAt: 0.95,
      planeSize: 34,
    });

    // init() hands back an instance even when its constructor bailed on a
    // missing target, and destroy() throws on one of those. `plane` is only set
    // once the layers are actually built.
    if (!made || !made.plane) return;
    engine.current = made;

    return () => {
      engine.current = null;
      made.destroy();
    };
  }, [button, elmo]);

  return useCallback(() => {
    engine.current?.send();
  }, []);
}
