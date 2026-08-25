#!/usr/bin/env node
/**
 * gmango.dev chat gateway.
 *
 * Sits between the public internet (via Tailscale Funnel or Cloudflare Tunnel)
 * and a local Ollama. Ollama itself is NEVER exposed: it binds to 127.0.0.1 and
 * only this process talks to it. That matters because Ollama's own API has no
 * auth, no rate limit, and lets the caller pick the model, the system prompt,
 * and unbounded generation lengths — publishing it directly hands a stranger
 * your laptop's GPU.
 *
 * Everything the model is told about Genova lives in ./knowledge/*.md and is
 * assembled here, server-side. The browser sends only conversation turns.
 *
 * Run:  node bot/server.mjs        (config in bot/.env, see .env.example)
 *
 * Endpoints:
 *   GET  /health  → cheap liveness probe; the site polls this to decide whether
 *                   to show the chat button at all.
 *   POST /chat    → NDJSON stream of {"t": "..."} chunks, then {"done": true}.
 *
 * There is deliberately no public /lead route. Lead emails are only ever sent
 * from inside a completed generation, when the model emits its sentinel line.
 * A public send-email endpoint behind a public URL is an open spam relay.
 */

import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* Node 20.12+ reads a .env without a dependency. Absent file is fine. */
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'));

const PORT = Number(process.env.BOT_PORT ?? 8787);
const OLLAMA = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.BOT_MODEL ?? 'qwen3:4b';

/* Keeps the weights resident between visitors. A cold load is ~2s of dead air
   on the first message; 30m of idle residency costs nothing but RAM. */
const KEEP_ALIVE = process.env.BOT_KEEP_ALIVE ?? '30m';

/* Short ceiling on replies. This is a site chat bubble, not an essay window —
   and generation time is linear in tokens produced. */
const MAX_TOKENS = Number(process.env.BOT_MAX_TOKENS ?? 400);
const NUM_CTX = Number(process.env.BOT_NUM_CTX ?? 8192);

const ORIGINS = (
  process.env.BOT_ALLOWED_ORIGINS ??
  'https://gmango.dev,https://www.gmango.dev,http://localhost:5173'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const RESEND_KEY = process.env.RESEND_API_KEY ?? '';
const LEAD_TO = process.env.LEAD_TO ?? '';
const LEAD_FROM = process.env.LEAD_FROM ?? '';

/* ---------------------------------------------------------------------------
 * Limits.
 *
 * CORS is not a security boundary — curl ignores it entirely. These caps are
 * what actually stands between a public URL and someone pinning your laptop's
 * GPU at 100% for an afternoon.
 * ------------------------------------------------------------------------ */
const LIMITS = {
  message: 1000, // chars per user turn
  history: 12, // turns kept from the client's transcript
  perIp: 12, // chat requests
  perIpWindowMs: 60_000,
  concurrent: 2, // simultaneous generations across all visitors
  leadPerIpMs: 10 * 60_000,
  leadPerHour: 20,
};

const chatHits = new Map();
const leadLast = new Map();
let leadHour = { start: Date.now(), count: 0 };
let inFlight = 0;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (chatHits.get(ip) ?? []).filter((t) => now - t < LIMITS.perIpWindowMs);
  recent.push(now);
  chatHits.set(ip, recent);
  if (chatHits.size > 5000) chatHits.clear(); // crude unbounded-growth guard
  return recent.length > LIMITS.perIp;
}

/* ---------------------------------------------------------------------------
 * System prompt.
 *
 * Assembled from every .md in ./knowledge, alphabetically. Re-read whenever a
 * file's mtime changes so you can tune the persona and see the difference on
 * the next message — no restart, no redeploy.
 * ------------------------------------------------------------------------ */
const KNOWLEDGE = join(here, 'knowledge');
let promptCache = { key: '', text: '' };

function systemPrompt() {
  const files = readdirSync(KNOWLEDGE)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const key = files.map((f) => `${f}:${statSync(join(KNOWLEDGE, f)).mtimeMs}`).join('|');
  if (key === promptCache.key) return promptCache.text;

  const text = files
    .map((f) => readFileSync(join(KNOWLEDGE, f), 'utf8').trim())
    .filter(Boolean)
    .join('\n\n---\n\n');

  promptCache = { key, text };
  console.log(`[bot] loaded ${files.length} knowledge file(s), ${text.length} chars`);
  return text;
}

/* ---------------------------------------------------------------------------
 * Lead capture.
 *
 * Structured tool-calling is unreliable at 4B. A sentinel line is not: the
 * model is told to print one when it has a name, an email, and a reason, and
 * this strips it out of the stream before the browser ever sees it.
 * ------------------------------------------------------------------------ */
const TAG = '[[LEAD]]';

/**
 * Split a streaming buffer into text safe to forward and text to hold back.
 * Tokens arrive mid-word, so a chunk can end halfway through the sentinel;
 * anything that could still turn into one stays in `keep` until proven
 * otherwise.
 */
function drain(buf, leads) {
  let out = '';
  for (;;) {
    const i = buf.indexOf(TAG);
    if (i === -1) break;
    const nl = buf.indexOf('\n', i);
    if (nl === -1) {
      /* Sentinel started but its line has not closed yet. */
      return { out: out + buf.slice(0, i), keep: buf.slice(i) };
    }
    out += buf.slice(0, i);
    leads.push(buf.slice(i + TAG.length, nl).trim());
    buf = buf.slice(nl + 1);
  }

  /* No complete tag. Hold back a trailing partial prefix of one. */
  let hold = 0;
  for (let n = Math.min(TAG.length - 1, buf.length); n > 0; n--) {
    if (TAG.startsWith(buf.slice(buf.length - n))) {
      hold = n;
      break;
    }
  }
  return hold
    ? { out: out + buf.slice(0, buf.length - hold), keep: buf.slice(buf.length - hold) }
    : { out: out + buf, keep: '' };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

async function sendLead(raw, { ip, transcript }) {
  if (!RESEND_KEY || !LEAD_TO || !LEAD_FROM) {
    console.warn('[bot] lead captured but mail is not configured:', raw);
    return;
  }

  let lead;
  try {
    lead = JSON.parse(raw);
  } catch {
    console.warn('[bot] lead sentinel was not valid JSON:', raw);
    return;
  }

  const name = String(lead.name ?? '').trim().slice(0, 120);
  const email = String(lead.email ?? '').trim().slice(0, 200);
  const summary = String(lead.summary ?? lead.interest ?? '').trim().slice(0, 2000);
  if (!name || !EMAIL_RE.test(email) || !summary) {
    console.warn('[bot] lead failed validation:', raw);
    return;
  }

  /* A visitor can talk the model into printing the sentinel. These caps mean
     the worst case is a couple of junk emails, not a mailbomb. */
  const now = Date.now();
  if (now - leadHour.start > 3_600_000) leadHour = { start: now, count: 0 };
  if (leadHour.count >= LIMITS.leadPerHour) return;
  if (now - (leadLast.get(ip) ?? 0) < LIMITS.leadPerIpMs) return;
  leadLast.set(ip, now);
  leadHour.count++;

  const stamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Chicago',
  });

  const log = transcript
    .map((m) => `${m.role === 'user' ? 'Visitor' : 'Bot'}: ${m.content}`)
    .join('\n\n');

  const html = `<!doctype html><html><body style="margin:0;background:#f5f1e8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1e8;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border:1px solid #e6e2d9;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <tr><td style="background:#9b111e;padding:20px 28px;color:#fff;font-size:17px;font-weight:700;">gmango.dev
    <span style="float:right;font-size:12px;font-weight:400;letter-spacing:1.2px;text-transform:uppercase;opacity:.85;">Chat bot lead</span></td></tr>
  <tr><td style="height:3px;background:#b8912f;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 28px 8px;">
    <p style="margin:0 0 20px;color:#6b6b6b;font-size:13px;">${esc(stamp)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
      <tr><td width="70" style="padding:6px 0;color:#6b6b6b;font-size:12px;letter-spacing:.8px;text-transform:uppercase;vertical-align:top;">Name</td>
          <td style="padding:6px 0;color:#1a1a1a;font-size:15px;font-weight:600;">${esc(name)}</td></tr>
      <tr><td width="70" style="padding:6px 0;color:#6b6b6b;font-size:12px;letter-spacing:.8px;text-transform:uppercase;vertical-align:top;">Email</td>
          <td style="padding:6px 0;font-size:15px;"><a href="mailto:${esc(email)}" style="color:#9b111e;text-decoration:none;font-weight:500;">${esc(email)}</a></td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbfaf7;border-left:3px solid #b8912f;border-radius:0 6px 6px 0;">
      <tr><td style="padding:18px 20px;color:#1a1a1a;font-size:15px;line-height:1.65;">${esc(summary).replace(/\n/g, '<br />')}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 28px 24px;">
    <p style="margin:18px 0 8px;color:#6b6b6b;font-size:12px;letter-spacing:.8px;text-transform:uppercase;">Transcript</p>
    <pre style="margin:0;padding:14px 16px;background:#f7f6f2;border-radius:6px;color:#3a3a3a;font-size:12px;line-height:1.6;white-space:pre-wrap;">${esc(log)}</pre>
  </td></tr>
  <tr><td style="height:1px;background:#e6e2d9;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:14px 28px;color:#6b6b6b;font-size:11px;line-height:1.6;">
    Captured by the site chat bot. The name and email are self-reported by the visitor — treat them as unverified.
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    'New lead from the gmango.dev chat bot',
    '',
    `Name:  ${name}`,
    `Email: ${email}`,
    `Sent:  ${stamp}`,
    '',
    '--- What they want ---',
    summary,
    '',
    '--- Transcript ---',
    log,
    '',
    'Name and email are self-reported by the visitor and unverified.',
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `gmango.dev bot <${LEAD_FROM}>`,
        to: [LEAD_TO],
        reply_to: email,
        subject: `Chat bot lead — ${name}`,
        html,
        text,
      }),
    });
    if (!res.ok) console.error('[bot] resend rejected the lead:', res.status, await res.text());
    else console.log(`[bot] lead emailed: ${name} <${email}>`);
  } catch (err) {
    console.error('[bot] lead email failed:', err);
  }
}

/* ---------------------------------------------------------------------------
 * Ollama
 * ------------------------------------------------------------------------ */

/* qwen3 reasons out loud unless told not to. Non-thinking models reject the
   flag outright, so the first rejection turns it off for good. */
let sendThinkFlag = process.env.BOT_THINK !== 'true';

async function ollamaChat(messages) {
  const body = {
    model: MODEL,
    messages,
    stream: true,
    keep_alive: KEEP_ALIVE,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_ctx: NUM_CTX,
      num_predict: MAX_TOKENS,
    },
  };
  if (sendThinkFlag) body.think = false;

  let res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok && sendThinkFlag) {
    const why = await res.text();
    if (/think/i.test(why)) {
      console.log(`[bot] ${MODEL} has no thinking mode; dropping the flag`);
      sendThinkFlag = false;
      delete body.think;
      res = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      throw new Error(`ollama ${res.status}: ${why.slice(0, 300)}`);
    }
  }
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/* /health must stay cheap — the site polls it. Cache so a refresh storm does
   not turn into a tag-listing storm. */
let healthCache = { at: 0, ok: false, installed: false };

async function ollamaUp() {
  const now = Date.now();
  if (now - healthCache.at < 10_000) return healthCache;
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error(String(res.status));
    const { models = [] } = await res.json();
    const base = MODEL.includes(':') ? MODEL : `${MODEL}:latest`;
    healthCache = {
      at: now,
      ok: true,
      installed: models.some((m) => m.name === base || m.model === base),
    };
  } catch {
    healthCache = { at: now, ok: false, installed: false };
  }
  return healthCache;
}

/* ---------------------------------------------------------------------------
 * HTTP
 * ------------------------------------------------------------------------ */
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (
    (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function readBody(req, cap = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > cap) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      parts.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleChat(req, res) {
  const ip = clientIp(req);
  if (rateLimited(ip)) return json(res, 429, { error: 'Slow down a moment.' });
  if (inFlight >= LIMITS.concurrent) return json(res, 503, { error: 'Busy — try again shortly.' });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return json(res, 400, { error: 'Malformed request.' });
  }

  /* Only conversation turns cross the wire. The client cannot choose the
     model, inject a system message, or raise any generation limit. */
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const turns = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-LIMITS.history)
    .map((m) => ({ role: m.role, content: String(m.content ?? '').slice(0, LIMITS.message) }))
    .filter((m) => m.content.trim());

  if (!turns.length || turns[turns.length - 1].role !== 'user') {
    return json(res, 400, { error: 'Nothing to answer.' });
  }

  const page = /^\/[a-z-]{0,24}$/.test(String(body.page ?? '')) ? body.page : null;

  const messages = [
    { role: 'system', content: systemPrompt() },
    ...(page ? [{ role: 'system', content: `The visitor is currently on the ${page} page.` }] : []),
    ...turns,
  ];

  inFlight++;
  let upstream;
  try {
    upstream = await ollamaChat(messages);
  } catch (err) {
    inFlight--;
    console.error('[bot] ollama call failed:', err.message);
    return json(res, 502, { error: 'The model is not responding right now.' });
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });

  const leads = [];
  let held = ''; // sentinel-safe tail
  let ndjson = ''; // partial line from upstream
  let full = '';

  /* fetch() yields Uint8Array, not Buffer, so .toString('utf8') would give
     "71,101,110..." rather than text. TextDecoder also stitches back together
     any multi-byte character split across a chunk boundary. */
  const decoder = new TextDecoder();

  try {
    for await (const chunk of upstream.body) {
      ndjson += decoder.decode(chunk, { stream: true });
      const lines = ndjson.split('\n');
      ndjson = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        let evt;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }
        const piece = evt.message?.content ?? '';
        if (piece) {
          full += piece;
          const { out, keep } = drain(held + piece, leads);
          held = keep;
          if (out) res.write(JSON.stringify({ t: out }) + '\n');
        }
        if (evt.done && held) {
          /* Stream ended mid-sentinel — flush whatever is left as text. */
          if (!held.startsWith(TAG)) res.write(JSON.stringify({ t: held }) + '\n');
          held = '';
        }
      }
    }
    res.write(JSON.stringify({ done: true }) + '\n');
  } catch (err) {
    console.error('[bot] stream broke:', err.message);
    res.write(JSON.stringify({ error: 'Connection interrupted.' }) + '\n');
  } finally {
    inFlight--;
    res.end();
  }

  for (const raw of leads) {
    await sendLead(raw, {
      ip,
      transcript: [...turns, { role: 'assistant', content: full.replace(/\[\[LEAD\]\].*/g, '').trim() }],
    });
  }
}

const server = createServer(async (req, res) => {
  cors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const path = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    const { ok, installed } = await ollamaUp();
    /* Non-200 when the model is missing, so the site hides the button rather
       than showing one that answers with an error. */
    return json(res, ok && installed ? 200 : 503, {
      ok: ok && installed,
      ollama: ok,
      model: MODEL,
      modelInstalled: installed,
    });
  }

  if (req.method === 'POST' && path === '/chat') return handleChat(req, res);

  return json(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bot] listening on http://0.0.0.0:${PORT}`);
  console.log(`[bot] ollama   ${OLLAMA}  model ${MODEL}`);
  console.log(`[bot] origins  ${ORIGINS.join(', ')}`);
  console.log(
    `[bot] leads    ${RESEND_KEY && LEAD_TO && LEAD_FROM ? `on → ${LEAD_TO}` : 'off (RESEND_API_KEY / LEAD_TO / LEAD_FROM unset)'}`,
  );
  systemPrompt();
});
