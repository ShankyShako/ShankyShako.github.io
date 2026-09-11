import { useEffect, useState } from 'react';

/**
 * gmango.dev is blocked on some networks — school and corporate filters
 * categorise it as a personal site and reset the TLS connection on the SNI
 * hostname alone. GitHub Pages serves the same build at a hostname those
 * filters let through, so the site stays readable either way.
 *
 * The redirect itself lives in an inline script in index.html so it runs before
 * the bundle. This is the same question asked from inside React, for the parts
 * of the UI that have to degrade when the API is out of reach.
 */

/* www, not the apex: the apex redirects there, and a redirect in front of a
   cross-origin POST breaks the CORS preflight. */
export const CANONICAL_ORIGIN = 'https://www.gmango.dev';

export function isMirror(): boolean {
  return window.location.hostname === 'shankyshako.github.io';
}

/**
 * Where `/api/*` lives. GitHub Pages is static, so the mirror has no functions
 * of its own and borrows the canonical origin's. Empty string everywhere else,
 * which leaves the same-origin request untouched.
 */
export function apiBase(): string {
  return isMirror() ? CANONICAL_ORIGIN : '';
}

/* Not cached. A remembered failure is how the mirror used to get stuck. */
export async function probeCanonical(): Promise<boolean> {
  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), 5000);
  try {
    /* `no-cors` returns an opaque response, which is all this needs: the
       question is whether the connection completes, not what came back. */
    await fetch(`${CANONICAL_ORIGIN}/image/favicon-32.png`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: ac.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * `null` while the answer is still unknown, so callers can hold off rather than
 * flashing a fallback. Always `true` off the mirror: the page itself came from
 * that origin, so it is reachable by definition.
 */
export function useCanonicalReachable(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(() => (isMirror() ? null : true));

  useEffect(() => {
    if (!isMirror()) return;
    let live = true;
    void probeCanonical().then((r) => {
      if (live) setReachable(r);
    });
    return () => {
      live = false;
    };
  }, []);

  return reachable;
}
