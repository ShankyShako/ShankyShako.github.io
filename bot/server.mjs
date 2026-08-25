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
import { appendFileSync, readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/* Node 20.12+ reads a .env without a dependency. Absent file is fine. */
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'));

const PORT = Number(process.env.BOT_PORT ?? 8787);
const OLLAMA = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const MODEL = process.env.BOT_MODEL ?? 'qwen3:8b';

/* Job-description matching is the one answer where being wrong is expensive —
   a fabricated match sends someone into an interview to be asked about a tool
   they have never opened. It is also rare, so it can afford a bigger, slower
   model than the chat path. Unset means "same model as everything else". */
const JD_MODEL = process.env.BOT_JD_MODEL || MODEL;

/* Keeps the weights resident between visitors. A cold load is ~2s of dead air
   on the first message; 30m of idle residency costs nothing but RAM. */
const KEEP_ALIVE = process.env.BOT_KEEP_ALIVE ?? '30m';

/* Short ceiling on replies. This is a site chat bubble, not an essay window —
   and generation time is linear in tokens produced. */
/* Covers the private scratchpad AND the spoken answer, since both come out of
   one generation. Nothing here is billed — the cost is latency, and generation
   time is linear in tokens, so a model that reasons for 800 tokens keeps the
   visitor waiting for all of them before the first word appears. */
const MAX_TOKENS = Number(process.env.BOT_MAX_TOKENS ?? 1500);
/* 12288, not 8192: the assembled system prompt is ~9.6k tokens on its own, so
   8192 cannot hold it before the visitor has typed anything. See the VRAM
   table in docs/CHATBOT.md before raising this on a small GPU — the KV cache
   grows linearly with it. */
const NUM_CTX = Number(process.env.BOT_NUM_CTX ?? 12288);

/* Job-description mode gets a longer answer, but deliberately NOT its own
   num_ctx. Ollama keys the loaded runner on num_ctx, so varying it per request
   unloads and reloads the model and throws away the cached prompt prefix:
   measured at 41.5s versus 0.7s for the identical request. One context size
   for every mode, always. */
const JD_MAX_TOKENS = Number(process.env.BOT_JD_MAX_TOKENS ?? 700);

const LOG_QUESTIONS = process.env.BOT_LOG_QUESTIONS !== 'false';

/* How long to wait for the *next* token before giving up. Not a cap on the
   whole reply — a slow GPU generating 400 tokens is fine, a GPU that has sent
   nothing for a minute is wedged. Ollama's own timeout is 5 minutes, which is
   long past the point every browser has already shown a network error. */
const STALL_MS = Number(process.env.BOT_STALL_MS ?? 60_000);

/* Lower than a chat model's usual 0.7. This bot's job is to be accurate about
   a real person's resume, and sampling temperature is the single biggest dial
   on how willing it is to invent a plausible-sounding detail. */
const TEMPERATURE = Number(process.env.BOT_TEMPERATURE ?? 0.4);

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

/* What each mode is allowed to cost. `maxMessage` is why JD mode exists as a
   mode at all: a 6000-char paste has to be let through, and letting every
   message be 6000 chars would hand anyone a cheap way to fill the context. */
const PROFILES = {
  chat: { model: MODEL, numCtx: NUM_CTX, maxTokens: MAX_TOKENS, maxMessage: 1000 },
  jd: { model: JD_MODEL, numCtx: NUM_CTX, maxTokens: JD_MAX_TOKENS, maxMessage: 6000 },
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

/* Compact overrides. With BOT_COMPACT=true any file in bot/compact/ replaces
   the same-named file in bot/knowledge/. Small models deliberate in proportion
   to how much they are told, so this trades detail for a reply that arrives. */
const COMPACT = process.env.BOT_COMPACT === 'true';
const COMPACT_DIR = join(here, 'compact');
const MODES = join(here, 'modes');

/** mtime-keyed cache so editing a prompt takes effect on the next message. */
function cachedRead(dir, match, cache) {
  const files = readdirSync(dir).filter(match).sort();
  const pick = (f) => {
    const override = join(COMPACT_DIR, f);
    return COMPACT && dir === KNOWLEDGE && existsSync(override) ? override : join(dir, f);
  };

  const key = files.map((f) => `${f}:${statSync(pick(f)).mtimeMs}`).join('|');
  if (key === cache.key) return cache.text;

  cache.key = key;
  cache.text = files
    .map((f) => readFileSync(pick(f), 'utf8').trim())
    .filter(Boolean)
    .join('\n\n---\n\n');
  return cache.text;
}

const knowledgeCache = { key: '', text: '' };
const modeCaches = {};

function systemPrompt() {
  return cachedRead(KNOWLEDGE, (f) => f.endsWith('.md'), knowledgeCache);
}

/**
 * Extra instructions for one mode, from ./modes/<name>.md. Loaded per request
 * rather than folded into the base prompt: JD-mode guidance is ~600 tokens
 * that a "where's the resume?" turn should not be paying for.
 */
function modePrompt(name) {
  if (name === 'chat') return null;
  modeCaches[name] ??= { key: '', text: '' };
  const text = cachedRead(MODES, (f) => f === `${name}.md`, modeCaches[name]);
  return text || null;
}

/* ---------------------------------------------------------------------------
 * Directives.
 *
 * Structured tool-calling is unreliable at 4B. A sentinel line is not: the
 * model prints `[[NAME]] payload` on its own line and this strips it out of
 * the stream before the browser ever sees it.
 *
 *   [[LEAD]]    {json}          — email Genova. Never reaches the browser.
 *   [[LINK]]    key             — attach a button, resolved against the menu.
 *   [[SUGGEST]] one | two       — follow-up chips.
 *   [[MUSIC]]   on | off        — the site's background music.
 *
 * Note what a directive can NOT do. There is no key that writes anything, and
 * LINK carries a menu key rather than a URL, so the worst a hijacked model can
 * emit is a link to a page of Genova's own site. Giving it raw hrefs would
 * make a successful prompt injection into a phishing-link generator.
 * ------------------------------------------------------------------------ */
const TAGS = ['[[SAY]]', '[[LEAD]]', '[[LINK]]', '[[SUGGEST]]', '[[MUSIC]]'];

/* ---------------------------------------------------------------------------
 * Reasoning suppression.
 *
 * Small models narrate their own scratchpad, in two different ways, and both
 * have to be caught here rather than asked away in the prompt.
 *
 *   1. Tagged. The model emits <think>...</think> around its working. Ollama's
 *      `think: false` usually prevents this, but a template that does not
 *      honour it lets the tags through as ordinary content.
 *   2. Untagged. "Let me analyse this question... The response should be:"
 *      followed by the real answer. No tags, nothing to strip — the only
 *      signal is the handoff phrase, which arrives long after the rambling.
 *
 * Case 1 is filtered inline below. Case 2 cannot be detected until the handoff
 * appears, so the stream sends a reset and the browser drops what it has.
 * ------------------------------------------------------------------------ */
const THINK_OPEN = ['<think>', '<thinking>', '<reasoning>'];
const THINK_CLOSE = ['</think>', '</thinking>', '</reasoning>'];

/* The phrase a model uses to hand off from working to answer. The trailing
   punctuation-or-newline is load-bearing: without it, "his final answer on the
   GAN was..." is read as a handoff and the real reply gets thrown away. */
const HANDOFF = new RegExp(
  '(?:^|\\n)[^\\n]{0,40}?(?:' +
    'let me (?:draft|write|craft|compose|put (?:it|this) together)|' +
    'the response should be(?: something like)?|' +
    "here.?s (?:my|the) (?:response|answer|draft)|" +
    'final (?:answer|response)|' +
    'my response(?: would be)?|' +
    'so,? my answer|' +
    'putting (?:it|this) together|' +
    'now (?:let me |i.?ll )?write|' +
    'draft|response' +
  ')\\s*(?:[:\\-\u2014]+\\s*|\\n+)',
  'i',
);

const DEBUG = process.env.BOT_DEBUG === 'true';

/** Earliest occurrence of any of `tags`, or {at:-1}. */
function firstOf(buf, tags) {
  let at = -1;
  let tag = null;
  for (const t of tags) {
    const i = buf.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) [at, tag] = [i, t];
  }
  return { at, tag };
}

/** How many trailing chars could still grow into one of `tags`. */
function partialHold(buf, tags) {
  const longest = Math.max(...tags.map((t) => t.length));
  for (let n = Math.min(longest - 1, buf.length); n > 0; n--) {
    const tail = buf.slice(buf.length - n);
    if (tags.some((t) => t.startsWith(tail))) return n;
  }
  return 0;
}

/**
 * Drop <think> blocks, keeping everything outside them.
 *
 * The hard case is an UNPAIRED closing tag. Qwen's chat template puts the
 * opening `<think>` into the prompt itself, so the model only ever generates
 * `</think>` — the block is already open before the first token arrives, and a
 * machine that waits for `<think>` never engages at all. An orphan close is
 * therefore not corruption: it means everything so far was reasoning.
 *
 * By then some of it has usually been streamed, so this reports `orphan` and
 * the caller retracts it with a reset.
 */
function stripThink(buf, st) {
  let out = '';
  let orphan = false;
  for (;;) {
    if (st.inside) {
      const { at, tag } = firstOf(buf, THINK_CLOSE);
      if (at === -1) {
        /* Still reasoning. Discard it all, but keep anything that might be
           the start of the closing tag. */
        const hold = partialHold(buf, THINK_CLOSE);
        return { out, keep: hold ? buf.slice(buf.length - hold) : '', orphan };
      }
      buf = buf.slice(at + tag.length);
      st.inside = false;
    } else {
      const open = firstOf(buf, THINK_OPEN);
      const close = firstOf(buf, THINK_CLOSE);

      /* A close with no open in front of it: the block was opened by the
         prompt template. Everything up to here was working. */
      if (close.at !== -1 && (open.at === -1 || close.at < open.at)) {
        orphan = true;
        out = '';
        buf = buf.slice(close.at + close.tag.length);
        continue;
      }

      if (open.at === -1) {
        /* Hold back a tail that could still become either kind of tag. */
        const hold = partialHold(buf, [...THINK_OPEN, ...THINK_CLOSE]);
        out += hold ? buf.slice(0, buf.length - hold) : buf;
        return { out, keep: hold ? buf.slice(buf.length - hold) : '', orphan };
      }
      out += buf.slice(0, open.at);
      buf = buf.slice(open.at + open.tag.length);
      st.inside = true;
    }
  }
}
const MAX_TAG = Math.max(...TAGS.map((t) => t.length));

/* The link menu is written by build-context.mjs from src/data. Absent file
   just means no buttons — the bot still answers. */
let LINKS = new Map();
try {
  const raw = JSON.parse(readFileSync(join(here, 'links.generated.json'), 'utf8'));
  LINKS = new Map(raw.links.map((l) => [l.key, l]));
} catch {
  console.warn('[bot] links.generated.json missing — run `node bot/build-context.mjs`');
}

function firstTag(buf) {
  let at = -1;
  let tag = null;
  for (const t of TAGS) {
    const i = buf.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) [at, tag] = [i, t];
  }
  return { at, tag };
}

/**
 * Split a streaming buffer into text safe to forward and text to hold back.
 * Tokens arrive mid-word, so a chunk can end halfway through a sentinel;
 * anything that could still become one stays in `keep` until proven otherwise.
 */
function drain(buf, found) {
  let out = '';
  for (;;) {
    const { at, tag } = firstTag(buf);
    if (at === -1) break;
    const nl = buf.indexOf('\n', at);
    if (nl === -1) {
      /* Sentinel started but its line has not closed yet. */
      return { out: out + buf.slice(0, at), keep: buf.slice(at) };
    }
    out += buf.slice(0, at);
    found.push({ tag: tag.slice(2, -2), payload: buf.slice(at + tag.length, nl).trim() });
    buf = buf.slice(nl + 1);
  }

  /* No complete tag. Hold back a trailing partial prefix of one. */
  let hold = 0;
  for (let n = Math.min(MAX_TAG - 1, buf.length); n > 0; n--) {
    const tail = buf.slice(buf.length - n);
    if (TAGS.some((t) => t.startsWith(tail))) {
      hold = n;
      break;
    }
  }
  return hold
    ? { out: out + buf.slice(0, buf.length - hold), keep: buf.slice(buf.length - hold) }
    : { out: out + buf, keep: '' };
}

/**
 * Turn a directive into something the browser may act on, or null to drop it.
 * Everything is validated here; the client trusts what it receives precisely
 * because nothing model-authored reaches it unchecked.
 */
function resolve({ tag, payload }, state) {
  switch (tag) {
    /* Handled by the caller as a gate, not an action. */
    case 'SAY':
      return null;

    case 'LEAD':
      state.leads.push(payload);
      return null;

    case 'LINK': {
      const link = LINKS.get(payload);
      if (!link) {
        console.warn(`[bot] dropped unknown link key: ${payload.slice(0, 60)}`);
        return null;
      }
      /* Two buttons is a helpful answer; six is a link farm. */
      if (state.links >= 2) return null;
      state.links++;
      return { type: 'link', href: link.href, label: link.label, kind: link.kind };
    }

    case 'SUGGEST': {
      if (state.suggested) return null;
      const items = payload
        .split('|')
        .map((s) => s.trim().slice(0, 70))
        .filter(Boolean)
        .slice(0, 3);
      if (!items.length) return null;
      state.suggested = true;
      return { type: 'suggest', items };
    }

    case 'MUSIC': {
      const want = payload.toLowerCase().trim();
      return want === 'on' || want === 'off' ? { type: 'music', state: want } : null;
    }

    default:
      return null;
  }
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
 * Question log.
 *
 * What visitors actually ask is the most useful thing this bot produces — it
 * tells you what the site fails to answer. One JSON object per line in
 * bot/questions.jsonl, gitignored, never leaves the laptop.
 *
 * Addresses are hashed rather than stored, against a salt generated once into
 * bot/.log-salt. That still distinguishes visitors from each other, which is
 * all the log is for, without keeping a file of who read what. Set
 * BOT_LOG_QUESTIONS=false to turn the whole thing off.
 * ------------------------------------------------------------------------ */
const LOG_FILE = join(here, 'questions.jsonl');
const SALT_FILE = join(here, '.log-salt');

let salt = '';
if (LOG_QUESTIONS) {
  try {
    salt = existsSync(SALT_FILE)
      ? readFileSync(SALT_FILE, 'utf8').trim()
      : (() => {
          const s = randomBytes(32).toString('hex');
          writeFileSync(SALT_FILE, s, { mode: 0o600 });
          return s;
        })();
  } catch (err) {
    console.warn('[bot] question log disabled — could not read/write salt:', err.message);
  }
}

const visitorId = (ip) =>
  createHash('sha256').update(salt + ip).digest('hex').slice(0, 12);

function logQuestion(entry) {
  if (!LOG_QUESTIONS || !salt) return;
  try {
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.warn('[bot] could not write question log:', err.message);
  }
}

/* ---------------------------------------------------------------------------
 * Ollama
 * ------------------------------------------------------------------------ */

/* Native reasoning, ON by default — the opposite of the obvious setting.
 *
 * A reasoning model reasons whether or not you allow it a channel for it. With
 * `think: false` qwen3 still works the problem, but the only place left to put
 * it is `content` — so "Okay, the user is asking..." lands in the chat bubble
 * and no amount of pattern-matching reliably gets it out again.
 *
 * With `think: true` the model's own chat template routes reasoning into a
 * separate `thinking` field. Measured on one reply: 2,218 chars of thinking,
 * 851 chars of answer, cleanly split. This gateway reads only `content`, so
 * the separation costs nothing and cannot be fooled by phrasing.
 *
 * The tokens are still generated either way — this buys correctness, not
 * speed, which is why BOT_MAX_TOKENS has to cover reasoning as well.
 */
const THINK = process.env.BOT_THINK !== 'false';

/* Models with no reasoning mode reject the flag outright rather than ignoring
   it, so the first rejection turns it off for the life of the process. */
let thinkSupported = true;

async function ollamaChat(messages, profile, signal) {
  const body = {
    model: profile.model,
    messages,
    stream: true,
    keep_alive: KEEP_ALIVE,
    options: {
      temperature: TEMPERATURE,
      top_p: 0.9,
      num_ctx: profile.numCtx,
      num_predict: profile.maxTokens,
    },
  };
  if (thinkSupported) body.think = THINK;

  let res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok && thinkSupported) {
    const why = await res.text();
    if (/think/i.test(why)) {
      console.log(`[bot] ${profile.model} has no thinking mode; dropping the flag`);
      thinkSupported = false;
      delete body.think;
      res = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
    } else {
      throw new Error(`ollama ${res.status}: ${why.slice(0, 300)}`);
    }
  }
  if (!res.ok) throw new Error(`ollama ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/* ---------------------------------------------------------------------------
 * Warmup.
 *
 * One real generation at startup, with num_predict 1. Three things fall out of
 * it, none of which are visible any other way:
 *
 *   1. Ollama reports `prompt_eval_count` — the EXACT token count of the
 *      assembled system prompt. Guessing from character count is how a prompt
 *      quietly grows past num_ctx and starts getting truncated.
 *   2. It times the prompt pass, which is the number that decides whether this
 *      machine can serve the bot at all.
 *   3. It leaves the weights loaded and the prompt prefix in the KV cache, so
 *      the first visitor is not the one who pays for it.
 *
 * A prompt that does not fit is reported as unhealthy, so the site hides the
 * chat button rather than offering one that times out.
 * ------------------------------------------------------------------------ */
let readiness = { ok: false, checked: false, promptTokens: 0, note: 'not checked yet' };

async function warmup() {
  const prompt = systemPrompt();
  const t0 = Date.now();

  try {
    const body = {
      model: MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'hi' },
      ],
      stream: false,
      keep_alive: KEEP_ALIVE,
      options: { num_ctx: NUM_CTX, num_predict: 1 },
    };
    if (thinkSupported) body.think = THINK;

    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.BOT_WARMUP_MS ?? 180_000)),
    });

    if (!res.ok) {
      const why = (await res.text()).slice(0, 200);
      /* Same one-shot fallback as ollamaChat: a model with no thinking mode
         rejects the flag rather than ignoring it. */
      if (thinkSupported && /think/i.test(why)) {
        thinkSupported = false;
        return warmup();
      }
      throw new Error(`ollama ${res.status}: ${why}`);
    }

    const data = await res.json();
    const tokens = data.prompt_eval_count ?? 0;
    const secs = (Date.now() - t0) / 1000;

    readiness = { ok: true, checked: true, promptTokens: tokens, note: 'ready' };

    console.log(
      `[bot] warmup: ${tokens.toLocaleString()} prompt tokens in ${secs.toFixed(1)}s` +
        (tokens && secs ? ` (${Math.round(tokens / secs).toLocaleString()} tok/s)` : ''),
    );

    /* "Fits" is not the bar — the prompt has to leave room for the exchange.
       At 96% of num_ctx the prompt loads fine and then every conversation is
       immediately truncated, which looks like a broken bot, not a full one. */
    const HEADROOM = 0.85;
    if (tokens >= NUM_CTX * HEADROOM) {
      readiness = {
        ok: false,
        checked: true,
        promptTokens: tokens,
        note: `prompt ${tokens} fills ${Math.round((tokens / NUM_CTX) * 100)}% of num_ctx ${NUM_CTX}`,
      };
      console.error(
        `\n[bot] STOP: the system prompt is ${tokens.toLocaleString()} tokens and ` +
          `BOT_NUM_CTX is ${NUM_CTX.toLocaleString()} — ` +
          `${Math.round((tokens / NUM_CTX) * 100)}% of the window.\n` +
          `      There is no room left for the conversation, so every reply is ` +
          `truncated, and on a small GPU\n      the prompt pass spills to CPU and stalls ` +
          `for minutes.\n` +
          `      Fix: set BOT_NUM_CTX=${Math.ceil((tokens * 1.4) / 1024) * 1024} in bot/.env, ` +
          `or trim bot/knowledge/*.md.\n` +
          `      Chat is reporting itself unhealthy until then, so the site hides the button.\n`,
      );
    } else if (tokens > NUM_CTX * 0.7) {
      console.warn(
        `[bot] warning: the prompt uses ${Math.round((tokens / NUM_CTX) * 100)}% of num_ctx — ` +
          `long conversations will start dropping their earliest turns.`,
      );
    }

    /* ~4.4 chars per token, calibrated against the measured count above.
       Estimated rather than measured because a second cold pass on a slow
       machine costs more than the precision is worth. */
    const jdChars = (() => {
      try {
        return readFileSync(join(MODES, 'jd.md'), 'utf8').length;
      } catch {
        return 0;
      }
    })();
    const jdBudget = tokens + Math.round(jdChars / 4.4) + Math.round(6000 / 4.4) + JD_MAX_TOKENS;
    if (jdBudget > NUM_CTX) {
      console.warn(
        `[bot] warning: a job-description match needs ~${jdBudget.toLocaleString()} tokens ` +
          `(prompt + mode + a 6k-char posting + the answer)\n` +
          `      but num_ctx is ${NUM_CTX.toLocaleString()}. That button will produce ` +
          `truncated matches. Raise BOT_NUM_CTX to ${Math.ceil((jdBudget * 1.1) / 1024) * 1024}.`,
      );
    }

    if (secs > 30) {
      console.warn(
        `[bot] warning: the prompt pass took ${secs.toFixed(0)}s. That is the delay before ` +
          `the FIRST token of every cold conversation.\n` +
          `      Usually means the model plus KV cache does not fit in VRAM. Lower ` +
          `BOT_NUM_CTX or use a smaller model.`,
      );
    }
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || /abort|timeout/i.test(err.message);
    readiness = {
      ok: false,
      checked: true,
      promptTokens: 0,
      note: timedOut ? 'warmup timed out' : err.message,
    };

    if (timedOut) {
      console.error(
        `\n[bot] warmup TIMED OUT. The model could not process a ` +
          `${(systemPrompt().length / 4.4).toFixed(0)}-token prompt in ` +
          `${(Number(process.env.BOT_WARMUP_MS ?? 180_000) / 1000).toFixed(0)}s.\n` +
          `      At that speed Ollama is almost certainly running on CPU, not the GPU. Check:\n` +
          `        ollama ps                 → the PROCESSOR column should say GPU, not CPU\n` +
          `        nvidia-smi                → confirms the driver is present and working\n` +
          `        journalctl -u ollama | grep -i "gpu\\|cuda\\|library"\n` +
          `      If it says CPU: install the CUDA driver, then restart Ollama.\n` +
          `      If it says GPU but is still slow, lower BOT_NUM_CTX so the KV cache fits.\n`,
      );
    } else {
      console.error(`[bot] warmup failed: ${err.message}`);
    }
  }
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
    /* Every model a profile can select, not just the chat one — a missing
       BOT_JD_MODEL would otherwise only surface when a visitor pastes a
       posting and gets an error. */
    const wanted = [...new Set(Object.values(PROFILES).map((p) => p.model))];
    healthCache = {
      at: now,
      ok: true,
      installed: wanted.every((want) => {
        const tag = want.includes(':') ? want : `${want}:latest`;
        return models.some((m) => m.name === tag || m.model === tag);
      }),
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

  /* The client picks a mode, but only from this set, and the mode only ever
     selects a server-side profile — it never carries limits of its own. */
  const mode = body.mode === 'jd' ? 'jd' : 'chat';
  const profile = PROFILES[mode];

  /* Only conversation turns cross the wire. The client cannot choose the
     model, inject a system message, or raise any generation limit. */
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const raw = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .slice(-LIMITS.history);

  /* The long allowance applies to the paste being sent now, not to the whole
     back-scroll: replaying a JD on every later turn would grow the context
     without bound. */
  const last = raw.length - 1;
  const turns = raw
    .map((m, i) => ({
      role: m.role,
      content: String(m.content ?? '').slice(0, i === last ? profile.maxMessage : LIMITS.message),
    }))
    .filter((m) => m.content.trim())
    /* Put the marker back on the model's own past replies.
     *
     * The browser only ever held the cleaned text, so without this the model
     * is told "every reply must contain [[SAY]]" and then shown a transcript
     * of its own replies that all lack it. A small model resolves that
     * contradiction in favour of the visible pattern, and quietly stops
     * emitting the marker a few turns in — taking its scratchpad public with
     * it. Restoring it makes the instruction and the evidence agree. */
    .map((m) =>
      m.role === 'assistant' && !m.content.includes('[[SAY]]')
        ? { ...m, content: `[[SAY]]\n${m.content}` }
        : m,
    );

  if (!turns.length || turns[turns.length - 1].role !== 'user') {
    return json(res, 400, { error: 'Nothing to answer.' });
  }

  /* A little situational awareness, allowlisted rather than trusted. It is
     what lets the bot answer "turn the music off" without guessing, and stops
     it offering a link to the page the visitor is already reading. */
  const page = /^\/[a-z-]{0,24}$/.test(String(body.page ?? '')) ? body.page : null;
  const MUSIC = {
    playing: 'The background music is playing.',
    muted: 'The background music is muted.',
    silent: 'The background music has never started — the visitor has not found the easter egg that reveals it.',
  };
  const music = MUSIC[String(body.music ?? '')] ?? null;

  const situation = [page && `The visitor is on the ${page} page.`, music]
    .filter(Boolean)
    .join(' ');

  const extra = modePrompt(mode);

  const messages = [
    { role: 'system', content: systemPrompt() },
    ...(extra ? [{ role: 'system', content: extra }] : []),
    ...(situation ? [{ role: 'system', content: situation }] : []),
    ...turns,
  ];

  const started = Date.now();
  const question = turns[turns.length - 1].content;

  /* Abort if the model goes quiet. The timer is reset by every chunk, so it
     bounds the gap between tokens rather than the length of the answer. */
  const ctrl = new AbortController();
  let stalled = false;
  let stallTimer;
  const kick = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      ctrl.abort();
    }, STALL_MS);
  };
  kick();

  inFlight++;
  let upstream;
  try {
    upstream = await ollamaChat(messages, profile, ctrl.signal);
  } catch (err) {
    clearTimeout(stallTimer);
    logQuestion({
      ts: new Date().toISOString(),
      visitor: visitorId(ip),
      page,
      mode,
      q: question,
      error: 'model-unreachable',
    });
    inFlight--;
    if (stalled) {
      console.error(
        `[bot] no first token in ${STALL_MS / 1000}s — the prompt pass is probably ` +
          `spilling out of VRAM. Check BOT_NUM_CTX.`,
      );
      return json(res, 504, { error: 'The model is taking too long to start. Try again shortly.' });
    }
    console.error('[bot] ollama call failed:', err.message);
    return json(res, 502, { error: 'The model is not responding right now.' });
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });

  const state = { leads: [], links: 0, suggested: false, acted: 0 };
  let held = ''; // sentinel-safe tail
  let ndjson = ''; // partial line from upstream
  let full = '';

  /* fetch() yields Uint8Array, not Buffer, so .toString('utf8') would give
     "71,101,110..." rather than text. TextDecoder also stitches back together
     any multi-byte character split across a chunk boundary. */
  const decoder = new TextDecoder();

  const think = { inside: false };
  let shown = ''; // visible text sent so far, for handoff detection
  let resets = 0;

  /* ---------------------------------------------------------------------
   * The [[SAY]] gate.
   *
   * Two rounds of pattern-matching against "Let me draft:" style preambles
   * taught the obvious lesson: a model can phrase its throat-clearing an
   * unbounded number of ways, so matching phrasings is unwinnable. Inverting
   * it is not. The model is told everything before [[SAY]] is discarded, so
   * it may reason as much as it likes — nothing is shown until it declares
   * it is ready to speak.
   *
   * The regex path below survives only as the fallback for when the model
   * forgets the marker entirely.
   * ------------------------------------------------------------------- */
  let speaking = false;
  let swallowed = '';
  let spoke = false; // has any visible text actually reached the browser?
  let thoughtChars = 0;

  /* Single exit for visible text, so "did the visitor get anything?" is one
     flag rather than three call sites that must all remember to set it. */
  const say = (text) => {
    if (!text) return;
    spoke = true;
    res.write(JSON.stringify({ t: text }) + '\n');
  };

  const flush = (text) => {
    /* Tagged reasoning first — whatever survives is candidate answer text. */
    const stripped = stripThink(text, think);

    /* The prompt template had opened a think block we never saw. Anything
       already on screen was reasoning; take it back. */
    if (stripped.orphan) {
      res.write(JSON.stringify({ reset: true }) + '\n');
      shown = '';
      swallowed = '';
      spoke = false;
      console.warn('[bot] retracted reasoning closed by an unpaired </think>');
    }
    const found = [];
    const { out, keep } = drain(stripped.out, found);

    /* The gate opens the moment [[SAY]] appears; text in the same chunk that
       preceded it is still working, and is dropped with the rest. */
    const opens = found.some((d) => d.tag === 'SAY');
    if (opens && !speaking) {
      speaking = true;
      if (DEBUG) console.log(`[bot] gate opened after ${swallowed.length} chars of working`);
    }

    if (!speaking) {
      /* Still working, so the prose is a draft and goes nowhere. Directives
         are not: a [[LEAD]] the model emits before the marker is still a real
         person asking to be contacted, and dropping it loses them silently.
         A stray button is a far cheaper mistake than a lost lead. */
      swallowed += out;
      for (const d of found) {
        const action = resolve(d, state);
        if (action) { state.acted++; res.write(JSON.stringify({ a: action }) + '\n'); }
      }
      return stripped.keep + keep;
    }

    if (out) {
      shown += out;

      /* Untagged reasoning: the model rambled, then announced its real answer.
         Everything before the announcement was working, not speech. Tell the
         browser to throw it away and start from the answer. */
      /* Not once. A model that pads can announce its answer, keep working,
         and announce again; the LAST announcement is the real one. Capped so
         a pathological reply cannot spin here. */
      const handoff = resets < 5 ? shown.match(HANDOFF) : null;
      if (handoff) {
        resets++;
        const answer = shown.slice(handoff.index + handoff[0].length).trimStart();
        shown = answer;
        res.write(JSON.stringify({ reset: true }) + '\n');
        say(answer);
        if (DEBUG) console.log('[bot] dropped reasoning preamble before answer');
      } else {
        say(out);
      }
    }

    for (const d of found) {
      const action = resolve(d, state);
      if (action) {
        state.acted++;
        res.write(JSON.stringify({ a: action }) + '\n');
      }
    }
    /* Both filters can hold text back; the think tail must come first so it is
       re-examined as a tag next time. */
    return stripped.keep + keep;
  };

  try {
    for await (const chunk of upstream.body) {
      kick();
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
        /* Ollama returns native reasoning in its own field. Reading only
           `content` is what keeps it off the wire — do not "fix" this by
           merging them. */
        if (evt.message?.thinking) thoughtChars += evt.message.thinking.length;
        if (evt.done && evt.done_reason === 'length') {
          console.warn(
            `[bot] reply hit the ${profile.maxTokens}-token ceiling and was cut off. ` +
              `If this is frequent, the model is padding — tighten the length rule in ` +
              `00-persona.md rather than raising BOT_MAX_TOKENS.`,
          );
        }
        const piece = evt.message?.content ?? '';
        if (piece) {
          full += piece;
          held = flush(held + piece);
        }
      }
    }

    /* Models routinely end without a trailing newline, which would strand a
       final directive in `held` forever. The synthetic newline closes it. */
    if (held) flush(held + '\n');

    /* Nothing reached the visitor. Two ways to get here, and the gate being
       open is NOT a reason to stay silent: a model that answers first and
       prints [[SAY]] afterwards leaves its whole reply sitting in `swallowed`.
       Recover it either way — visible working beats an empty bubble, and an
       empty bubble beats "I didn't manage an answer" on a reply that exists. */
    if (!spoke && swallowed.trim()) {
      const handoff = [...swallowed.matchAll(new RegExp(HANDOFF.source, 'gi'))].pop();
      const answer = handoff
        ? swallowed.slice(handoff.index + handoff[0].length).trim()
        : swallowed.trim();
      console.warn(
        `[bot] recovered a reply the gate swallowed (${speaking ? 'marker came after the answer' : 'no [[SAY]] at all'})`,
      );
      say(answer);
    }

    /* Genuinely empty. Usually means the model put its entire reply in the
       reasoning channel, which is a model problem, not a parsing one — say so
       rather than leaving the visitor with a shrug. */
    if (!spoke && !state.acted) {
      console.warn(
        `[bot] EMPTY REPLY: ${thoughtChars} chars of reasoning, ${full.length} chars of content.` +
          (thoughtChars > 0 && full.length < 20
            ? `\n      The model answered inside its reasoning channel and returned nothing to say.` +
              `\n      If this repeats, set BOT_THINK=false in bot/.env — the [[SAY]] gate handles` +
              `\n      reasoning for models that cannot keep the two apart.`
            : ''),
      );
    }

    res.write(JSON.stringify({ done: true }) + '\n');
  } catch (err) {
    const why = stalled
      ? `The model stopped responding after ${STALL_MS / 1000}s.`
      : 'Connection interrupted.';
    console.error('[bot] stream broke:', stalled ? 'stalled' : err.message);
    res.write(JSON.stringify({ error: why }) + '\n');
  } finally {
    clearTimeout(stallTimer);
    inFlight--;
    res.end();
  }

  if (DEBUG) console.log('[bot] raw>', JSON.stringify(full.slice(0, 500)));

  logQuestion({
    ts: new Date().toISOString(),
    visitor: visitorId(ip),
    page,
    mode,
    q: question,
    chars: question.length,
    replyChars: full.length,
    actions: state.links + (state.suggested ? 1 : 0),
    lead: state.leads.length > 0,
    ms: Date.now() - started,
  });

  for (const raw of state.leads) {
    await sendLead(raw, {
      ip,
      transcript: [
        ...turns,
        { role: 'assistant', content: full.replace(/\[\[[A-Z]+\]\].*/g, '').trim() },
      ],
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
    /* Non-200 when the model is missing OR when warmup found the prompt does
       not fit, so the site hides the button rather than showing one that
       answers with an error — or worse, one that hangs. */
    const healthy = ok && installed && readiness.ok;
    return json(res, healthy ? 200 : 503, {
      ok: healthy,
      ollama: ok,
      model: MODEL,
      modelInstalled: installed,
      promptTokens: readiness.promptTokens,
      numCtx: NUM_CTX,
      note: readiness.note,
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
  console.log(
    `[bot] thinking ${THINK ? 'native — reasoning routed to its own channel and dropped' : 'OFF'}`,
  );
  console.log(`[bot] tokens   ${MAX_TOKENS} max, ctx ${NUM_CTX}, temperature ${TEMPERATURE}`);
  if (COMPACT) console.log('[bot] compact  on — bot/compact/*.md overriding bot/knowledge/');

  /* bot/.env is a copy of the example, not a link to it, so a setting that was
     renamed or retired sits there looking authoritative and doing nothing.
     Every one of these cost real debugging time; say them out loud. */
  if (process.env.BOT_JD_NUM_CTX) {
    console.warn(
      `[bot] ignoring BOT_JD_NUM_CTX — a per-mode context size makes Ollama reload the\n` +
        `      model between requests (measured 41.5s vs 0.7s). BOT_NUM_CTX covers every mode.`,
    );
  }
  if (!THINK) {
    console.warn(
      `\n[bot] warning: BOT_THINK=false does NOT stop a reasoning model reasoning. It removes\n` +
        `      the separate channel it reasons into, so the working ends up in the reply where\n` +
        `      the visitor reads it. This is the cause of "thinking output in the chat".\n` +
        `      Set BOT_THINK=true in bot/.env.\n`,
    );
  }
  if (THINK && MAX_TOKENS < 1000) {
    console.warn(
      `[bot] warning: BOT_MAX_TOKENS is ${MAX_TOKENS}, but reasoning and the answer share one\n` +
        `      budget — a few hundred tokens of thinking leaves nothing for the reply.\n` +
        `      Set BOT_MAX_TOKENS=1500 in bot/.env.`,
    );
  }
  if (MAX_TOKENS < 1000 && THINK) {
    console.warn(
      `[bot] warning: BOT_MAX_TOKENS is ${MAX_TOKENS}, but reasoning is generated from the same\n` +
        `      budget as the answer — a few hundred tokens of thinking will leave nothing for\n` +
        `      the reply. Set BOT_MAX_TOKENS=1500 in bot/.env.`,
    );
  }
  systemPrompt();

  /* Swapping models mid-conversation is the same trap as swapping num_ctx, and
     worse: Ollama unloads one set of weights and loads the other, so the first
     job-description match pays a full cold start. Two models will not sit in
     6 GB of VRAM together. Measured cost of a reload: 41.5s versus 0.7s. */
  if (JD_MODEL !== MODEL) {
    console.warn(
      `[bot] note: BOT_JD_MODEL (${JD_MODEL}) differs from BOT_MODEL (${MODEL}).\n` +
        `      Every switch between them unloads and reloads the weights, and only the\n` +
        `      chat model is warmed at startup. Worth it on a machine with VRAM to spare;\n` +
        `      on a 6 GB card, set them the same.`,
    );
  }

  warmup();
});
