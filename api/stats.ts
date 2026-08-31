import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Counters for the desktop pet easter egg.
 *
 * GET  /api/stats            → { poses } — the one number the site renders.
 * GET  /api/stats?key=…      → every counter, for the owner.
 * POST /api/stats            → { events: { pose: 3, … } }, batched by the client.
 *
 * Storage is Upstash Redis over its REST API, so there is no driver to install
 * and no connection to hold open across a cold start. Required env vars (set in
 * the Vercel dashboard):
 *
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *   ADMIN_STATS_KEY          — the secret for the full breakdown
 *
 * With none of them set the endpoint answers 204 and the counter disappears
 * from the page. That is the intended fallback, not an error state.
 *
 * Self-contained on purpose — see the banner in contact.ts: Vercel skips
 * `_`-prefixed paths under /api, so a shared helper can be missing from the
 * deployed bundle and kill the function before it runs a line.
 *
 * This is a decoration, not an audited metric. The checks below (allowlist,
 * clamp, size cap, same-origin) stop a stray script and a bored passer-by;
 * anyone determined can still inflate the number, and that is an acceptable
 * outcome for a counter under a cartoon.
 */

/* The only keys that may be written. Without this the endpoint is an open
   write to arbitrary Redis keys. */
const EVENTS = [
  'pose', 'pose_idle', 'activate', 'throw', 'escape',
  'elmo_on', 'elmo_off', 'chat_open', 'chat_message',
] as const;
type Event = (typeof EVENTS)[number];

/** The public number. Everything else is for the owner's eyes. */
const PUBLIC_EVENT: Event = 'pose';

const KEY = (e: Event) => `pet:${e}`;
/** One batch is ~10s of one visitor; anything larger is not a person. */
const MAX_DELTA = 50;
const MAX_BODY = 512;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_KEY = process.env.ADMIN_STATS_KEY;

/** Run a pipeline of Redis commands. Returns null on any failure. */
async function pipeline(cmds: string[][]): Promise<unknown[] | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cmds),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0;
  return Number.isFinite(n) ? n : 0;
};

const resultOf = (row: unknown): unknown =>
  (row as { result?: unknown } | null)?.result ?? null;

/** Length-independent compare, so the key cannot be guessed a character at a time. */
function secretEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * A write must come from a page on this deployment. Trivially forgeable by
 * anything that is not a browser — the point is only that a random site cannot
 * drive the number from a visitor's tab.
 */
function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;  // same-origin fetches often omit it entirely
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    /* Nothing configured: say nothing, successfully. The client treats this
       exactly like "no number" and renders no counter. */
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const key = typeof req.query.key === 'string' ? req.query.key : '';
    const admin = !!ADMIN_KEY && secretEquals(key, ADMIN_KEY);

    if (admin) {
      const rows = await pipeline(EVENTS.map((e) => ['GET', KEY(e)]));
      if (!rows) return res.status(502).json({ error: 'stats unavailable' });
      const stats: Record<string, number> = {};
      EVENTS.forEach((e, i) => { stats[e] = num(resultOf(rows[i])); });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ stats });
    }

    /* A wrong key falls through to the public shape rather than erroring —
       a 401 would confirm there is something behind the door. */
    const rows = await pipeline([['GET', KEY(PUBLIC_EVENT)]]);
    if (!rows) return res.status(502).json({ error: 'stats unavailable' });
    /* Cheap enough that a page refresh is free, short enough that the number
       still moves while someone is playing with him. */
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    return res.status(200).json({ poses: num(resultOf(rows[0])) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });

  /* sendBeacon posts a Blob, which Vercel may hand over unparsed. */
  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return res.status(413).json({ error: 'too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad json' }); }
  }

  const events = (body as { events?: unknown })?.events;
  if (!events || typeof events !== 'object') {
    return res.status(400).json({ error: 'bad request' });
  }

  const cmds: string[][] = [];
  for (const e of EVENTS) {
    const raw = (events as Record<string, unknown>)[e];
    const n = Math.floor(num(raw));
    if (n >= 1) cmds.push(['INCRBY', KEY(e), String(Math.min(n, MAX_DELTA))]);
  }
  /* Unknown keys are simply not read — the loop above is the allowlist. */
  if (cmds.length === 0) return res.status(204).end();

  cmds.push(['GET', KEY(PUBLIC_EVENT)]);
  const rows = await pipeline(cmds);
  if (!rows) return res.status(502).json({ error: 'stats unavailable' });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ poses: num(resultOf(rows[rows.length - 1])) });
}
