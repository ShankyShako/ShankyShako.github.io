import { useEffect, useState } from 'react';

/**
 * gmango.dev is blocked on some networks — school and corporate filters
 * categorise it as a personal site and reset the TLS connection on the SNI
 * hostname alone. GitHub Pages serves the same build at a hostname those
 * filters let through, so the site stays readable either way.
 *
 * The failover only works in one direction. A blocked origin never gets a byte
 * to the browser, so it cannot redirect anyone; only the reachable hostname can
 * decide where a visitor should end up. The redirect itself lives in an inline
 * script in index.html so it can run before the bundle loads. This module is
 * the same question asked from inside React, for the parts of the UI that have
 * to degrade when the API is out of reach.
 */

export const CANONICAL_ORIGIN = 'https://gmango.dev';

/** Kept explicit so local dev and Vercel previews behave exactly as production. */
const MIRROR_HOSTS = new Set(['shankyshako.github.io']);

const KEY = 'canon-reachable';

export function isMirror(): boolean {
  return MIRROR_HOSTS.has(window.location.hostname);
}

/**
 * Where `/api/*` lives. GitHub Pages is static, so the mirror has no functions
 * of its own and borrows the canonical origin's. Empty string everywhere else,
 * which leaves the same-origin request untouched.
 */
export function apiBase(): string {
  return isMirror() ? CANONICAL_ORIGIN : '';
}

/* Shared with the inline script in index.html, which usually gets there first.
   sessionStorage throws outright in some privacy modes, so every access is
   guarded and a failure just means the probe runs again. */
function cached(): boolean | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

export async function probeCanonical(): Promise<boolean> {
  const hit = cached();
  if (hit !== null) return hit;

  const ac = new AbortController();
  const timer = window.setTimeout(() => ac.abort(), 1500);
  let ok = false;
  try {
    /* `no-cors` returns an opaque response, which is all this needs: the
       question is whether the connection completes, not what came back. It
       also means the image needs no CORS headers. A filtered network resets
       during the handshake and rejects in well under 100ms, so the timeout
       only matters on a genuinely slow link. */
    await fetch(`${CANONICAL_ORIGIN}/image/favicon-32.png`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: ac.signal,
    });
    ok = true;
  } catch {
    ok = false;
  } finally {
    window.clearTimeout(timer);
  }

  try {
    sessionStorage.setItem(KEY, ok ? '1' : '0');
  } catch {
    /* private mode; the answer just is not remembered */
  }
  return ok;
}

/**
 * `null` while the answer is still unknown, so callers can hold off rather than
 * flashing a fallback. Always `true` off the mirror: the page itself came from
 * that origin, so it is reachable by definition.
 */
export function useCanonicalReachable(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(() =>
    isMirror() ? cached() : true,
  );

  useEffect(() => {
    if (!isMirror() || reachable !== null) return;
    let live = true;
    void probeCanonical().then((r) => {
      if (live) setReachable(r);
    });
    return () => {
      live = false;
    };
  }, [reachable]);

  return reachable;
}
