/**
 * The counter under the pet.
 *
 * One tiny pipe for the whole site: `bump()` from anywhere, batched, and
 * posted to /api/stats. Only the pose count ever comes back to the browser —
 * everything else here exists so the owner can read it with the admin key, and
 * would be noise on the page.
 *
 * Three rules this file exists to enforce:
 *   1. Never a request per event. A visitor hovering the pet triggers a pose
 *      every ~1.5s; unbatched that is a request every 1.5s.
 *   2. Never surface a failure. The counter is decoration — a dead endpoint,
 *      an ad blocker, or an offline tab must all look like "no number", not
 *      like a broken site. Every path here swallows.
 *   3. Never send anything about *what* was said or read. These are counts of
 *      gestures, nothing else.
 */

/** Every event the API will accept. The server allowlists the same set. */
export type StatEvent =
  | 'pose'          // a pose the visitor caused — the public number
  | 'pose_idle'     // one he struck by himself; kept apart so 'pose' means something
  | 'activate'      // the bag got poked and he fell in
  | 'throw'
  | 'escape'        // posted through the hole in the wall
  | 'elmo_on'
  | 'elmo_off'
  | 'chat_open'
  | 'chat_message';

const ENDPOINT = '/api/stats';
/** Long enough that a hover-happy visitor still costs one request. */
const FLUSH_MS = 10_000;

const pending = new Map<StatEvent, number>();
let timer: number | null = null;
let hooked = false;

/** Poses this visitor has caused since the page loaded. */
let mine = 0;
const listeners = new Set<(n: number) => void>();

/* Honoured for writes only: reading the global number tells the server nothing
   about who asked. */
const optedOut = () =>
  typeof navigator !== 'undefined'
  && (navigator.doNotTrack === '1'
    || (window as unknown as { doNotTrack?: string }).doNotTrack === '1');

function drain(): Record<string, number> | null {
  if (pending.size === 0) return null;
  const events: Record<string, number> = {};
  pending.forEach((n, k) => { events[k] = n; });
  pending.clear();
  return events;
}

/**
 * `beacon` is the only thing that reliably lands while a tab is going away —
 * a normal fetch is cancelled with the document on mobile. It is also fire and
 * forget, which is exactly right here: there is no answer worth waiting for.
 */
function flush(beacon = false) {
  if (timer !== null) { window.clearTimeout(timer); timer = null; }
  const events = drain();
  if (!events) return;

  const body = JSON.stringify({ events });
  try {
    if (beacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
      return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* Counts are dropped rather than retried. Nothing here is worth a queue. */
  }
}

function hook() {
  if (hooked) return;
  hooked = true;
  /* 'hidden' rather than 'unload': it is the one lifecycle event mobile
     browsers actually fire when a tab is backgrounded or closed. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', () => flush(true));
}

/** Record one gesture. Cheap, synchronous, safe to call from the rAF loop. */
export function bump(event: StatEvent, n = 1) {
  if (event === 'pose') {
    mine += n;
    listeners.forEach((fn) => fn(mine));
  }
  if (optedOut()) return;

  hook();
  pending.set(event, (pending.get(event) ?? 0) + n);
  if (timer === null) timer = window.setTimeout(() => flush(), FLUSH_MS);
}

/** The global total, or null if the endpoint has nothing to say. */
export async function fetchTotal(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch(ENDPOINT, { signal });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const poses = (data as { poses?: unknown })?.poses;
    return typeof poses === 'number' && Number.isFinite(poses) ? poses : null;
  } catch {
    return null;
  }
}

/** Watch this visitor's own pose count, for the optimistic half of the display. */
export function subscribeMine(fn: (n: number) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const minePoses = () => mine;
