#!/usr/bin/env node
/**
 * gmango.dev chat gateway.
 *
 * Sits between the public internet and hosted model APIs (Groq, OpenRouter).
 * The API keys never leave this process, and the browser never picks the
 * model, the system prompt, or the generation length — a public endpoint that
 * let it would hand a stranger your free-tier quota.
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

import { asksPetToLeave } from './petIntent.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/* Node 20.12+ reads a .env without a dependency. Absent file is fine. */
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'));

const PORT = Number(process.env.BOT_PORT ?? 8787);

/* ---------------------------------------------------------------------------
 * Backends.
 *
 * Each mode has a chain of "provider:model" entries, tried in order. A 429, a
 * 5xx, a network error, or no response within STALL_MS moves the request to
 * the next entry. Only failures before the reply starts fail over: once text
 * is streaming to the browser, that model finishes the answer.
 * ------------------------------------------------------------------------ */
const PROVIDERS = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY ?? '' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY ?? '' },
};

/* Splits on the FIRST colon only: OpenRouter ids carry their own (`…:free`). */
function parseChain(name, spec) {
  const chain = [];
  for (const raw of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const at = raw.indexOf(':');
    const provider = raw.slice(0, at);
    const model = raw.slice(at + 1);
    if (at < 1 || !model || !PROVIDERS[provider]) {
      console.warn(`[bot] ${name}: skipping "${raw}" — expected groq:<model> or openrouter:<model>`);
    } else if (!PROVIDERS[provider].key) {
      console.warn(`[bot] ${name}: skipping ${raw} — ${provider.toUpperCase()}_API_KEY is not set`);
    } else if (provider === 'openrouter' && !model.endsWith(':free')) {
      /* An account holding credits bills a paid id. Free ids only. */
      console.warn(`[bot] ${name}: skipping ${raw} — only :free OpenRouter models are allowed`);
    } else {
      chain.push({ id: raw, provider, model });
    }
  }
  return chain;
}

/* Groq counts each model's quota separately, so a second Groq model on the
   same key covers the first one's per-minute ceiling. */
const CHAT_CHAIN = parseChain(
  'BOT_CHAT_CHAIN',
  process.env.BOT_CHAT_CHAIN ?? 'groq:qwen/qwen3.6-27b,groq:llama-3.3-70b-versatile',
);

/* Job-description matching is the one answer where being wrong is expensive —
   a fabricated match sends someone into an interview to be asked about a tool
   they have never opened. It is also the long request (a 6000-char posting),
   so it starts on OpenRouter, whose free tier limits requests rather than
   tokens per minute, and falls back to the chat models. */
const JD_CHAIN = parseChain(
  'BOT_JD_CHAIN',
  process.env.BOT_JD_CHAIN ??
    'openrouter:nvidia/nemotron-3-super-120b-a12b:free,groq:qwen/qwen3.6-27b,groq:llama-3.3-70b-versatile',
);

/* Short ceiling on replies. This is a site chat bubble, not an essay window.
   Reasoning is switched off upstream (see reasoningParams), so the budget buys
   answer tokens only — and on Groq every one also counts against the
   per-minute quota. */
const MAX_TOKENS = Number(process.env.BOT_MAX_TOKENS ?? 600);

/* A match is a longer answer, but it has to fit through Groq's per-minute
   ceiling too when OpenRouter is down, so it stays modest. */
const JD_MAX_TOKENS = Number(process.env.BOT_JD_MAX_TOKENS ?? 800);

/* Compact overrides. With BOT_COMPACT=true any file in bot/compact/ replaces
   the same-named file in bot/knowledge/, trading detail for a smaller prompt. */
const COMPACT = process.env.BOT_COMPACT === 'true';

/* Per provider, because their ceilings differ. Groq's free tier caps tokens
   per minute, so it wants the compact prompt; OpenRouter's caps requests, so
   it can afford the full one, which gives a JD match more to match against.
   Unset, both inherit BOT_COMPACT. */
const asBool = (v, fallback) => (v === undefined ? fallback : v === 'true');
const COMPACT_BY = {
  groq: asBool(process.env.BOT_GROQ_COMPACT, COMPACT),
  openrouter: asBool(process.env.BOT_OPENROUTER_COMPACT, COMPACT),
};

const LOG_QUESTIONS = process.env.BOT_LOG_QUESTIONS !== 'false';

/* How long to wait for the next chunk. Before the reply starts, running out
   moves the request to the next backend; after, it ends the reply. A cap on
   silence, not on the length of the answer. */
const STALL_MS = Number(process.env.BOT_STALL_MS ?? 30_000);

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
 * what actually stands between a public URL and someone draining the free
 * quotas in an afternoon.
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
  chat: { chain: CHAT_CHAIN, maxTokens: MAX_TOKENS, maxMessage: 1000 },
  jd: { chain: JD_CHAIN, maxTokens: JD_MAX_TOKENS, maxMessage: 6000 },
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

/* COMPACT and COMPACT_BY are declared with the other config at the top. */
const COMPACT_DIR = join(here, 'compact');
const MODES = join(here, 'modes');

/** mtime-keyed cache so editing a prompt takes effect on the next message. */
function cachedRead(dir, match, cache, compact = false) {
  const files = readdirSync(dir).filter(match).sort();
  const pick = (f) => {
    const override = join(COMPACT_DIR, f);
    return compact && dir === KNOWLEDGE && existsSync(override) ? override : join(dir, f);
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

/* One cache PER VARIANT. A single cache would thrash: the key is built from the
   mtimes of the files actually picked, so alternating between a Groq turn and
   an OpenRouter turn would miss every time and re-read all of knowledge/
   on both. Two caches make each variant steady-state. */
const knowledgeCaches = { full: { key: '', text: '' }, compact: { key: '', text: '' } };
const modeCaches = {};

function systemPrompt(compact = COMPACT) {
  const cache = knowledgeCaches[compact ? 'compact' : 'full'];
  return cachedRead(KNOWLEDGE, (f) => f.endsWith('.md'), cache, compact);
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
 *   [[PET]]     away            — the desktop pet walks off, back into his bag.
 *
 * Note what a directive can NOT do. There is no key that writes anything, and
 * LINK carries a menu key rather than a URL, so the worst a hijacked model can
 * emit is a link to a page of Genova's own site. Giving it raw hrefs would
 * make a successful prompt injection into a phishing-link generator.
 * ------------------------------------------------------------------------ */
const TAGS = ['[[SAY]]', '[[LEAD]]', '[[LINK]]', '[[SUGGEST]]', '[[MUSIC]]', '[[PET]]'];

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
      if (want === 'on' || want === 'off') {
        state.earlyStop = true;
        return { type: 'music', state: want };
      }
      return null;
    }

    case 'PET': {
      /* One direction only. Nothing brings him back: the bag in the corner is
         the way in, and it's the visitor's to click. */
      if (payload.toLowerCase().trim() === 'away') {
        state.earlyStop = true;
        return { type: 'pet', state: 'away' };
      }
      return null;
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
 * bot/questions.jsonl, gitignored, never leaves the host.
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
 * Rate-limit cooldowns.
 *
 * Kept per chain entry, not per provider: Groq counts each model's quota
 * separately, so one model being limited says nothing about the next. A 429
 * benches the entry until its reset time rather than spending another request
 * to learn it is still limited. Nothing here ever needs a restart.
 * ------------------------------------------------------------------------ */
const cooldowns = new Map(); // entry id → epoch ms

function coolingDown(entry) {
  const until = cooldowns.get(entry.id);
  if (!until) return false;
  if (Date.now() < until) return true;
  cooldowns.delete(entry.id);
  console.log(`[bot] ${entry.id} cooldown over`);
  return false;
}

function setCooldown(entry, headers) {
  /* Groq sends retry-after in seconds. OpenRouter may send x-ratelimit-reset
     as epoch ms instead — for its daily cap that is tomorrow, which is exactly
     how long the entry should sit out. */
  const after = Number(headers?.get('retry-after'));
  const reset = Number(headers?.get('x-ratelimit-reset'));
  const until =
    after > 0 ? Date.now() + after * 1000 : reset > Date.now() ? reset : Date.now() + 60_000;
  cooldowns.set(entry.id, until);
  console.warn(`[bot] ${entry.id} rate-limited until ${new Date(until).toLocaleTimeString()}`);
}

/* ---------------------------------------------------------------------------
 * Reasoning.
 *
 * The default models reason unless told not to, and left to their defaults
 * they return the working in the reply — the out-loud scratchpad the [[SAY]]
 * gate exists to catch. Turning it off upstream is cheaper and more reliable
 * than filtering it downstream, and every token not spent thinking is one the
 * visitor does not wait for.
 *
 * BOT_GROQ_REASONING:
 *   none            — no reasoning generated. Fastest, cheapest. (default)
 *   low|medium|high — reason at that effort. gpt-oss refuses none, takes low.
 *   hidden          — model still reasons; Groq strips it server-side.
 *   raw             — reasoning inline in <think> tags; stripThink eats it.
 *   parsed          — reasoning in its own field, which this gateway drops.
 *   off             — send nothing, let Groq default.
 *
 * OpenRouter always asks for effort "none".
 * ------------------------------------------------------------------------ */
const GROQ_REASONING = (process.env.BOT_GROQ_REASONING ?? 'none').toLowerCase();
const EFFORTS = new Set(['none', 'low', 'medium', 'high']);

/* A model with no reasoning control, or with mandatory reasoning, rejects the
   parameter outright rather than ignoring it. The first rejection moves that
   model to its fallback form for the life of the process. */
const reasoningRejected = new Set();

function reasoningParams(entry) {
  const rejected = reasoningRejected.has(entry.id);
  if (entry.provider === 'openrouter') {
    /* `exclude` still keeps the working out of the reply; it just costs the time. */
    return { reasoning: rejected ? { exclude: true } : { effort: 'none' } };
  }
  if (rejected || GROQ_REASONING === 'off') return {};
  /* none/low/medium/high are effort levels; the rest are output formats. The
     distinction matters because a model that refuses one effort level may take
     another: gpt-oss rejects `none` but accepts `low`, and without that the
     latch above would leave it reasoning at its default on every message. */
  return EFFORTS.has(GROQ_REASONING)
    ? { reasoning_effort: GROQ_REASONING }
    : { reasoning_format: GROQ_REASONING };
}

function upstreamError(entry, status, text, headers) {
  const err = new Error(`${entry.id} ${status}: ${text.slice(0, 300)}`);
  err.status = status;
  err.headers = headers;
  return err;
}

/* Opens a streaming completion. Resolves when the response headers arrive;
   handleChat still waits for the first event before committing to the entry. */
async function callModel(entry, messages, maxTokens, signal) {
  const { url, key } = PROVIDERS[entry.provider];
  const send = () =>
    fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: entry.model,
        messages,
        stream: true,
        temperature: TEMPERATURE,
        top_p: 0.9,
        max_tokens: maxTokens,
        ...reasoningParams(entry),
      }),
      signal,
    });

  let res = await send();

  /* Guarded to 400 so a 429 still reaches the caller with its headers. */
  if (res.status === 400 && !reasoningRejected.has(entry.id)) {
    const why = await res.text();
    if (!/reasoning/i.test(why)) throw upstreamError(entry, 400, why, res.headers);
    console.log(`[bot] ${entry.id} rejected its reasoning parameter; retrying without it`);
    reasoningRejected.add(entry.id);
    res = await send();
  }
  if (!res.ok) throw upstreamError(entry, res.status, await res.text(), res.headers);
  return sseToNdjson(res.body, entry);
}

/* Re-emits an OpenAI-style SSE stream as the NDJSON events handleChat reads:
   {message: {content}}, {message: {thinking}}, and {done, done_reason}. */
async function* sseToNdjson(stream, entry) {
  const enc = new TextEncoder();
  const decoder = new TextDecoder();
  const event = (obj) => enc.encode(JSON.stringify(obj) + '\n');
  let buffer = '';

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      /* This also skips OpenRouter's ": OPENROUTER PROCESSING" comments, which
         must not count as progress: a model stuck in the queue would keep
         resetting the stall timer and never fail over. */
      if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;

      let data;
      try {
        data = JSON.parse(trimmed.slice(6));
      } catch {
        continue; // incomplete chunk
      }

      /* A failure after the 200 arrives as an event, not a status code. The
         code rides along so a rate limit here still benches the entry. */
      if (data.error) {
        const err = new Error(`${entry.id} stream error: ${data.error.message ?? JSON.stringify(data.error)}`);
        err.status = Number(data.error.code) || 0;
        throw err;
      }

      const choice = data.choices?.[0];
      /* Forwarded as `thinking` so it is COUNTED but never spoken — the
         empty-reply diagnostic needs to know the model talked to itself. */
      if (choice?.delta?.reasoning) yield event({ message: { thinking: choice.delta.reasoning } });
      if (choice?.delta?.content) yield event({ message: { content: choice.delta.content } });
      if (choice?.finish_reason === 'length') yield event({ done: true, done_reason: 'length' });
    }
  }
}

/* ---------------------------------------------------------------------------
 * Readiness.
 *
 * A hosted API has nothing to warm up, so this only checks configuration:
 * chat needs at least one usable chain entry, or /health says so and the site
 * hides the chat button rather than offering one that can only error.
 * promptTokens is an estimate (~4.4 chars per token), there so /health shows
 * at a glance whether the running bot has the current prompt.
 * ------------------------------------------------------------------------ */
const unserved = Object.keys(PROFILES).filter((mode) => !PROFILES[mode].chain.length);
const readiness = {
  /* Chat is what the button is for. A JD chain with nothing usable is logged
     and named in `note`, but does not take the whole bot down. */
  ok: CHAT_CHAIN.length > 0,
  promptTokens: Math.round(systemPrompt(COMPACT_BY[CHAT_CHAIN[0]?.provider ?? 'groq']).length / 4.4),
  note: unserved.length ? `no usable backend for ${unserved.join(', ')}` : 'ready',
};

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
  /* Same for the desktop pet: "get rid of him" only makes sense while he's out. */
  const PET = {
    out: 'The desktop pet, a small cutout of Genova walking along the bottom of the page, is out.',
    away: 'The desktop pet is tucked away in his bag in the corner.',
  };
  const pet = PET[String(body.pet ?? '')] ?? null;

  /* JD mode never touches the page, music, or the pet — the whole reply is
     about the posting, so this situational noise is pure YAGNI there. */
  const situation =
    mode === 'jd'
      ? ''
      : [page && `The visitor is on the ${page} page.`, music, pet].filter(Boolean).join(' ');

  /* "hide the pet" and the like don't need the model (see petIntent.mjs). */
  if (mode === 'chat' && body.pet === 'out' && asksPetToLeave(turns[turns.length - 1].content)) {
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
    res.write(JSON.stringify({ t: 'Off he goes, back into his bag.' }) + '\n');
    res.write(JSON.stringify({ a: { type: 'pet', state: 'away' } }) + '\n');
    res.end(JSON.stringify({ done: true }) + '\n');
    return;
  }

  const extra = modePrompt(mode);

  /* Assembled per attempt, not once. The compact variant belongs to the
     provider that ends up serving the request, which is not known until the
     entries before it have failed. Only the system text varies; the turns are
     shared. */
  const buildMessages = (compact) => [
    { role: 'system', content: systemPrompt(compact) },
    ...(extra ? [{ role: 'system', content: extra }] : []),
    ...(situation ? [{ role: 'system', content: situation }] : []),
    ...turns,
  ];

  const started = Date.now();
  const question = turns[turns.length - 1].content;

  /* Abort if the model goes quiet. The timer is reset by every chunk, so it
     bounds the gap between chunks rather than the length of the answer. Each
     attempt gets its own controller, so a stalled backend cannot abort the one
     that replaces it. */
  let ctrl;
  let stalled = false;
  let stallTimer;
  const kick = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      ctrl.abort();
    }, STALL_MS);
  };

  inFlight++;
  let upstream;
  let active;

  /* A visitor who closes the tab frees the generation slot, rather than
     holding it until the model finishes talking to nobody. */
  let gone = false;
  res.on('close', () => {
    gone = true;
    ctrl?.abort();
  });

  for (const entry of profile.chain) {
    if (gone) break;
    if (coolingDown(entry)) continue;
    ctrl = new AbortController();
    stalled = false;
    kick();
    try {
      const stream = await callModel(entry, buildMessages(COMPACT_BY[entry.provider]), profile.maxTokens, ctrl.signal);
      /* Headers are not a reply. A free model can answer 200 and then sit in a
         queue, or send an error event, so the entry is only chosen once its
         first event arrives. Until then, failing over is still possible. */
      const first = await stream.next();
      if (first.done) throw new Error(`${entry.id} ended the stream without a reply`);
      upstream = (async function* () {
        yield first.value;
        yield* stream;
      })();
      active = entry;
      break;
    } catch (err) {
      clearTimeout(stallTimer);
      if (err.status === 429) setCooldown(entry, err.headers);
      else console.warn(`[bot] ${entry.id} failed: ${stalled ? `no response in ${STALL_MS / 1000}s` : err.message}`);
    }
  }

  if (!upstream) {
    logQuestion({
      ts: new Date().toISOString(),
      visitor: visitorId(ip),
      page,
      mode,
      q: question,
      error: gone ? 'visitor-left' : 'all-backends-failed',
    });
    inFlight--;
    return json(res, 502, { error: 'The model is not responding right now. Try again shortly.' });
  }
  if (active !== profile.chain[0]) console.log(`[bot] ${mode} answered by fallback ${active.id}`);

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });

  const state = { leads: [], links: 0, suggested: false, acted: 0, earlyStop: false };
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
    for await (const chunk of upstream) {
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
        /* Reasoning arrives in its own field. Reading only `content` is what
           keeps it off the wire — do not "fix" this by merging them. */
        if (evt.message?.thinking) thoughtChars += evt.message.thinking.length;
        if (evt.done && evt.done_reason === 'length') {
          console.warn(
            `[bot] reply hit the ${profile.maxTokens}-token ceiling and was cut off (${active.id}). ` +
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

      /* A directive like [[MUSIC]] is the entire answer — kill the stream
         immediately so the model stops generating and we save tokens. */
      if (state.earlyStop) {
        ctrl.abort();
        if (DEBUG) console.log('[bot] early-stopped stream after directive');
        break;
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
          ` (${active.id})` +
          (thoughtChars > 0 && full.length < 20
            ? `\n      The model answered inside its reasoning channel and returned nothing to say.`
            : ''),
      );
    }

    res.write(JSON.stringify({ done: true }) + '\n');
  } catch (err) {
    if (state.earlyStop || ctrl.signal.aborted && !stalled) {
      // Intentionally aborted for early stop (like music off) - close cleanly
      res.write(JSON.stringify({ done: true }) + '\n');
    } else {
      const why = stalled
        ? `The model stopped responding after ${STALL_MS / 1000}s.`
        : 'Connection interrupted.';
      console.error('[bot] stream broke:', stalled ? 'stalled' : err.message);
      res.write(JSON.stringify({ error: why }) + '\n');
    }
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
    backend: active.id,
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
        /* `shown`, not `full` — `full` is everything the model generated,
           scratchpad included. `shown` is what actually reached the browser,
           which is what "the conversation" means to the recipient reading it. */
        ...turns,
        { role: 'assistant', content: shown.replace(/\[\[[A-Z]+\]\].*/g, '').trim() },
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
    /* Non-200 when chat has no usable backend, so the site hides the button
       rather than showing one that can only answer with an error. A cooldown
       does not count: the next entry in the chain covers it. */
    const now = Date.now();
    return json(res, readiness.ok ? 200 : 503, {
      ok: readiness.ok,
      chat: CHAT_CHAIN.map((e) => e.id),
      jd: JD_CHAIN.map((e) => e.id),
      promptTokens: readiness.promptTokens,
      note: readiness.note,
      coolingDown: [...cooldowns].filter(([, until]) => until > now).map(([id]) => id),
    });
  }

  if (req.method === 'POST' && path === '/chat') return handleChat(req, res);

  return json(res, 404, { error: 'Not found.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[bot] listening on http://0.0.0.0:${PORT}`);
  for (const [mode, p] of Object.entries(PROFILES)) {
    console.log(`[bot] ${mode.padEnd(8)} ${p.chain.map((e) => e.id).join(' → ') || '(none)'}  ${p.maxTokens} tokens`);
  }
  console.log(
    `[bot] prompt   ~${readiness.promptTokens.toLocaleString()} tokens  compact groq ${COMPACT_BY.groq ? 'on' : 'off'}, ` +
      `openrouter ${COMPACT_BY.openrouter ? 'on' : 'off'}  temperature ${TEMPERATURE}  groq reasoning ${GROQ_REASONING}`,
  );
  console.log(`[bot] origins  ${ORIGINS.join(', ')}`);
  console.log(
    `[bot] leads    ${RESEND_KEY && LEAD_TO && LEAD_FROM ? `on → ${LEAD_TO}` : 'off (RESEND_API_KEY / LEAD_TO / LEAD_FROM unset)'}`,
  );
  if (!readiness.ok) {
    console.error(`[bot] NOT READY: ${readiness.note}. /health answers 503, so the site hides the chat button.`);
  } else if (unserved.length) {
    console.error(`[bot] WARNING: ${readiness.note}. Those requests will fail until a chain entry is usable.`);
  }

  /* bot/.env is a copy of the example, not a link to it, so a retired setting
     sits there looking authoritative and doing nothing. Say so. */
  const retired = [
    'BOT_MODEL', 'BOT_JD_MODEL', 'OLLAMA_URL', 'BOT_OLLAMA_FALLBACK_MODEL', 'BOT_THINK', 'BOT_NUM_CTX',
    'BOT_JD_NUM_CTX', 'BOT_KEEP_ALIVE', 'BOT_WARMUP_MS', 'BOT_OLLAMA_MAX_TOKENS', 'BOT_OLLAMA_JD_MAX_TOKENS',
    'BOT_OLLAMA_COMPACT',
  ].filter((k) => process.env[k] !== undefined);
  if (retired.length) {
    console.warn(`[bot] ignoring retired settings: ${retired.join(', ')} — models now come from BOT_CHAT_CHAIN / BOT_JD_CHAIN`);
  }

  /* Read every prompt variant a request can use now, so the first visitor
     after a failover is not the one who pays to read knowledge/. */
  for (const compact of new Set(Object.values(COMPACT_BY))) systemPrompt(compact);
});
