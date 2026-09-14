#!/usr/bin/env node
/**
 * One real request to every model in BOT_CHAT_CHAIN and BOT_JD_CHAIN, with the
 * prompt and parameters the server sends, timed. Run it after changing a key or
 * a chain, or to try a candidate model before putting it in one. Costs one
 * request per model against that provider's free quota.
 *
 *   node bot/test-models.mjs                 both chains
 *   node bot/test-models.mjs jd              JD chain only
 *   node bot/test-models.mjs jd openrouter:google/gemma-4-31b-it:free
 *                                            one model, not necessarily in a chain
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'));

const URLS = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};
const KEYS = { groq: process.env.GROQ_API_KEY, openrouter: process.env.OPENROUTER_API_KEY };

const compactFor = (provider) => {
  const v = process.env[`BOT_${provider.toUpperCase()}_COMPACT`];
  return v === undefined ? process.env.BOT_COMPACT === 'true' : v === 'true';
};

function systemPrompt(compact) {
  const pick = (f) =>
    compact && existsSync(join(here, 'compact', f)) ? join(here, 'compact', f) : join(here, 'knowledge', f);
  return readdirSync(join(here, 'knowledge'))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => readFileSync(pick(f), 'utf8').trim())
    .filter(Boolean)
    .join('\n\n---\n\n');
}

const POSTING = `Junior Software Engineer (AI Products) - Austin, TX (Hybrid)
We are hiring a junior engineer to build LLM-powered features in our customer support platform.
Requirements: BS in Computer Science or related field; 0-2 years experience; Python and TypeScript;
React; REST APIs; exposure to LLM APIs (OpenAI, Anthropic) and prompt engineering; Git and CI/CD basics.
Nice to have: AWS (Lambda, S3), Docker, PostgreSQL, vector databases, Kubernetes, Go.
Responsibilities: ship features end to end, write tests, take part in code reviews, work with design.`;

/* Defaults match server.mjs, so an unset chain tests what the server runs. */
const MODES = {
  chat: {
    chain: process.env.BOT_CHAT_CHAIN ?? 'groq:qwen/qwen3.6-27b,groq:llama-3.3-70b-versatile',
    maxTokens: Number(process.env.BOT_MAX_TOKENS ?? 600),
    turn: 'What has Genova built with LLMs?',
  },
  jd: {
    chain:
      process.env.BOT_JD_CHAIN ??
      'openrouter:nvidia/nemotron-3-super-120b-a12b:free,groq:qwen/qwen3.6-27b,groq:llama-3.3-70b-versatile',
    maxTokens: Number(process.env.BOT_JD_MAX_TOKENS ?? 800),
    turn: POSTING,
    extra: readFileSync(join(here, 'modes', 'jd.md'), 'utf8'),
  },
};

/* Mirrors reasoningParams() in server.mjs, including its one retry. */
const GROQ_REASONING = (process.env.BOT_GROQ_REASONING ?? 'none').toLowerCase();
const reasoning = (provider, retry) => {
  if (provider === 'openrouter') return { reasoning: retry ? { exclude: true } : { effort: 'none' } };
  if (retry || GROQ_REASONING === 'off') return {};
  return GROQ_REASONING === 'none' ? { reasoning_effort: 'none' } : { reasoning_format: GROQ_REASONING };
};

async function run(mode, id) {
  const at = id.indexOf(':');
  const provider = id.slice(0, at);
  const model = id.slice(at + 1);
  if (!URLS[provider]) return console.log(`✗ ${id}: unknown provider`);
  if (!KEYS[provider]) return console.log(`✗ ${id}: ${provider.toUpperCase()}_API_KEY is not set`);
  /* Same billing guard as the server. */
  if (provider === 'openrouter' && !model.endsWith(':free')) return console.log(`✗ ${id}: only :free OpenRouter models`);

  const m = MODES[mode];
  const messages = [
    { role: 'system', content: systemPrompt(compactFor(provider)) },
    ...(m.extra ? [{ role: 'system', content: m.extra }] : []),
    { role: 'user', content: m.turn },
  ];

  const t0 = Date.now();
  const send = (retry) =>
    fetch(URLS[provider], {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEYS[provider]}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, messages, stream: true, temperature: Number(process.env.BOT_TEMPERATURE ?? 0.4), top_p: 0.9, max_tokens: m.maxTokens,
        ...reasoning(provider, retry),
      }),
      signal: AbortSignal.timeout(120_000),
    });

  let res = await send(false);
  let note = '';
  if (res.status === 400) {
    const why = await res.text();
    if (!/reasoning/i.test(why)) return console.log(`✗ ${id} [${mode}]: 400 ${why.slice(0, 200)}`);
    note = ' (rejected reasoning "none"; retried without it, as the server does)';
    res = await send(true);
  }
  if (!res.ok) return console.log(`✗ ${id} [${mode}]: ${res.status} ${(await res.text()).slice(0, 200)}`);

  let first = 0;
  let content = '';
  let thinking = 0;
  let finish = '';
  let buf = '';
  const dec = new TextDecoder();
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith('data: ') || l.includes('[DONE]')) continue;
      let d;
      try {
        d = JSON.parse(l.slice(6));
      } catch {
        continue;
      }
      if (d.error) return console.log(`✗ ${id} [${mode}]: stream error ${d.error.message ?? ''}`);
      const c = d.choices?.[0];
      if (c?.delta?.reasoning) thinking += c.delta.reasoning.length;
      if (c?.delta?.content) {
        first ||= Date.now() - t0;
        content += c.delta.content;
      }
      if (c?.finish_reason) finish = c.finish_reason;
    }
  }

  const s = (ms) => `${(ms / 1000).toFixed(1)}s`;
  console.log(
    `\n✓ ${id} [${mode}]${note}\n  first word ${s(first)}, done ${s(Date.now() - t0)}, ${content.length} chars` +
      (thinking ? `, ${thinking} chars of reasoning` : '') +
      (finish === 'length' ? ', CUT OFF at max tokens' : ''),
  );
  console.log('  ' + content.slice(0, 600).replace(/\n/g, '\n  ') + (content.length > 600 ? ' …' : ''));
}

const [only, single] = process.argv.slice(2);
for (const mode of only ? [only] : ['chat', 'jd']) {
  if (!MODES[mode]) {
    console.error(`unknown mode "${mode}" (use chat or jd)`);
    process.exit(1);
  }
  const ids = single ? [single] : (MODES[mode].chain ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) console.log(`BOT_${mode.toUpperCase()}_CHAIN is not set in bot/.env`);
  /* One at a time: back-to-back Groq calls already brush its per-minute ceiling. */
  for (const id of ids) {
    try {
      await run(mode, id);
    } catch (err) {
      console.log(`✗ ${id} [${mode}]: ${err.message}`);
    }
  }
}
