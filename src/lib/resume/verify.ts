/**
 * Checks a model's rewrite of a bullet before it can reach the page. Any
 * failure rejects the rewrite and the original bullet stays. The prompt asks
 * for the same rules, but a prompt is not enforcement; this is.
 *
 * Ported from Resumator's engine/verify.js.
 */
import type { Fragment } from '../../data/resume.ts';
import { extractNumbers, norm } from './text.ts';

/* A rewrite may move down this ladder or stay put. Moving up is a promotion
   the source never claimed. */
const OWNERSHIP = [
  ['helped', 'assisted', 'supported', 'contributed to', 'participated in', 'co-authored'],
  ['collaborated on', 'worked on', 'implemented', 'developed', 'built', 'created', 'designed', 'engineered'],
  ['drove', 'owned', 'owning', 'led', 'spearheaded', 'architected', 'founded', 'managed', 'pioneered', 'directed',
    'headed', 'oversaw', 'supervised', 'orchestrated', 'championed', 'first author', 'first-authored', 'lead author'],
];

/* Tool names a rewrite may not introduce. Anything acronym-shaped or with a
   digit or symbol in it counts as well (see looksTechnical). */
const TECH = new Set([
  'python', 'javascript', 'typescript', 'java', 'kotlin', 'swift', 'swiftui', 'go', 'rust', 'ruby', 'php', 'scala',
  'matlab', 'sql', 'bash', 'react', 'vue', 'angular', 'svelte', 'node', 'express', 'django', 'flask', 'fastapi',
  'rails', 'spring', 'ios', 'android', 'flutter', 'xcode', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform',
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'kafka', 'spark', 'airflow', 'snowflake', 'pytorch',
  'tensorflow', 'keras', 'jax', 'onnx', 'cuda', 'langchain', 'llamaindex', 'huggingface', 'transformers', 'pandas',
  'numpy', 'sqlite', 'ollama', 'whisper', 'slurm', 'solidity', 'hardhat', 'ipfs', 'metamask', 'leaflet', 'racket',
  'coremotion', 'entrez', 'pubmed', 'gymnasium', 'wav2vec2', 'roberta', 'albert', 'bert', 'gpt', 'llama', 'mistral',
  'claude', 'openai', 'vllm', 'triton', 'mlflow', 'kubeflow', 'sagemaker', 'bedrock', 'vertex', 'databricks',
  'tableau', 'figma', 'unity', 'unreal', 'opencv', 'yolo', 'rag', 'graphql', 'grpc', 'websocket', 'websockets',
]);

function looksTechnical(token: string): boolean {
  if (TECH.has(token.toLowerCase())) return true;
  if (/^[A-Z]{2,}s?$/.test(token)) return true; // REST, SQL, LLMs
  if (/\d/.test(token) && /[A-Za-z]/.test(token)) return true; // S3, V2
  if (/[+#]/.test(token)) return true; // C++, C#
  if (/\.(js|ts|py|net|io|ai)$/i.test(token)) return true; // Next.js
  if (/^[a-z]+[A-Z]/.test(token)) return true; // camelCase
  return false;
}

function ownership(text: string): { rank: number; term: string | null } {
  const low = text.toLowerCase();
  let rank = -1;
  let term: string | null = null;
  OWNERSHIP.forEach((tier, i) => {
    for (const t of tier) if (i > rank && new RegExp(`\\b${t}\\b`).test(low)) [rank, term] = [i, t];
  });
  return { rank, term };
}

/** Skills the bullet names in its own text. Those must survive a rewrite. */
export function technologiesOf(f: Fragment): string[] {
  const low = f.text.toLowerCase();
  return f.skills.filter((s) => low.includes(s.toLowerCase()));
}

/* Models write non-breaking hyphens ("DeepSeek‑V2"), thin spaces ("0.56 %"),
   and Markdown. Straighten all of it before checking, and before printing:
   "game‑theory" should still count as naming "Game theory". */
export function normalizeRewrite(text: string): string {
  return text
    .replace(/[\u2010-\u2012\u2212]/g, '-')
    .replace(/[\u00a0\u2009\u202f]/g, ' ')
    .replace(/\*|__|`/g, '')
    .replace(/(\d) %/g, '$1%')
    .replace(/^["“]|["”]$/g, '')
    .trim();
}

const loose = (s: string) => s.toLowerCase().replace(/[\s-]+/g, '');
const numKey = (s: string) => s.replace(/[\s,]+/g, '').toLowerCase();

/* Characters Latin Modern prints. Anything else would be a missing-glyph box. */
const PRINTABLE = /^[\x20-\x7e’‘“”–—…é]$/;

/* A reworded bullet may bring in a few linking words; past this many, it is
   saying something new. */
const MAX_NEW_WORDS = 3;

/* Words that make a claim: a metric, a scale, a direction, a deployment. A
   rewrite may use one only if the original does, even when the job asks for
   it. "Accuracy" becoming "precision", or "increase" becoming "decrease", is a
   different fact in the same number of words. */
const CLAIMS = new Set(['accuracy', 'precision', 'recall', 'f1', 'auc', 'latency', 'user', 'patient', 'customer', 'revenue',
  'production', 'deploy', 'deployed', 'ship', 'shipped', 'launch', 'launched', 'thousand', 'million', 'hundred',
  'decrease', 'reduce', 'reduc', 'increase', 'increas', 'improv', 'diagnosis', 'diagnos']);
const FILLER = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'from', 'into', 'at',
  'as', 'via', 'that', 'which', 'its', 'their', 'while', 'using', 'across', 'within', 'through', 'over', 'under', 'than']);
/* Figures written as words, and words that flip a claim. Short, so the
   new-word count below would miss them. */
const FLIPS = new Set(['no', 'not', 'never', 'without', 'fail', 'failed', 'failing', 'one', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twice', 'half', 'double']);
const PAST = new Set(['built', 'drove', 'led', 'ran', 'wrote', 'made', 'won', 'grew', 'took', 'set', 'kept', 'brought',
  'taught', 'found', 'began', 'gave', 'held', 'sent', 'spent', 'cut', 'put', 'rebuilt', 'undertook', 'oversaw']);
const stem = (w: string) => w.toLowerCase().replace(/(ing|ed|es|s)$/, '');

export type Verdict = { ok: boolean; why: string[] };

/**
 * @param query the job text. Its words may appear in a rewrite ("the job's
 *              words where the facts support them"), but never as a tool:
 *              a posting that asks for Kubernetes does not make it a fact.
 */
export function verifyRewrite(f: Fragment, rewritten: string, query = ''): Verdict {
  const rw = rewritten.trim();
  const orig = f.text;
  const why: string[] = [];
  if (!rw) return { ok: false, why: ['came back empty'] };
  if (rw.length > orig.length * 1.3 + 20) why.push('ran long');

  for (const ch of new Set(rw)) if (!PRINTABLE.test(ch) && !orig.includes(ch)) why.push(`used "${ch}", which the page cannot print`);

  /* Counted, not just matched: "10-meter walk" does not license "10 patients".
     Paired figures ("99%/91% binary/family") count as one, in order, so
     swapping them is a change. */
  const pairs = (t: string) => t.match(/\d[\d.,]*%?(?:\/\d[\d.,]*%?)+/g) ?? [];
  const count = (t: string) => [...extractNumbers(t), ...pairs(t)].map(numKey).reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map<string, number>());
  const src = count(orig);
  const got = count(rw);
  for (const n of src.keys()) if (!got.has(n)) why.push(`dropped "${n}"`);
  for (const [n, k] of got) if (k > (src.get(n) ?? 0)) why.push(`added "${n}"`);

  for (const t of technologiesOf(f)) if (!loose(rw).includes(loose(t))) why.push(`dropped "${t}"`);

  const was = ownership(orig);
  const now = ownership(rw);
  if (now.rank > (was.rank < 0 ? 1 : was.rank)) why.push(`said "${now.term}" where the original says "${was.term ?? 'less'}"`);

  /* New tools and names. Hyphenated words are checked part by part, so
     "Kubernetes-scale" is still Kubernetes; a capitalised word anywhere but
     the start is a name, and has to be in the source. */
  const words = (t: string) =>
    norm(t).split(/[\s/-]+/).map((w) => w.replace(/^[.']+|[.']+$/g, '').replace(/'s$/, '')).filter(Boolean);
  const srcWords = words(`${orig} ${f.skills.join(' ')}`);
  const known = new Set(srcWords.flatMap((w) => [w, stem(w)]));
  const seen = new Set<string>();
  const tokens = rw.match(/(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#.&]*/g) ?? [];
  tokens.forEach((m, i) => {
    const bare = norm(m).replace(/\.+$/, '');
    if (!bare || known.has(bare) || known.has(stem(bare)) || seen.has(bare)) return;
    /* The first word is usually a capitalised verb; anything else there is a name. */
    const verb = i === 0 && (/ed$/.test(m) || PAST.has(bare));
    if (looksTechnical(m) || (/^[A-Z]/.test(m) && !verb)) {
      seen.add(bare);
      why.push(`added "${m}"`);
    }
  });

  const job = new Set(words(query).map(stem));
  for (const w of new Set(words(rw))) if (FLIPS.has(w) && !known.has(w)) why.push(`added "${w}"`);
  const added = new Set(words(rw).filter((w) => w.length > 2 && !FILLER.has(w) && !FLIPS.has(w) && !known.has(w) && !known.has(stem(w))));
  for (const w of added) if (CLAIMS.has(w) || CLAIMS.has(stem(w))) why.push(`added "${w}"`);
  /* The job's own words are the point of rewording, but they still add up:
     past a few, the bullet describes the posting instead of the work. */
  const fresh = [...added].filter((w) => !job.has(stem(w)));
  if (added.size > MAX_NEW_WORDS + 2) why.push(`added ${added.size} new words (${[...added].slice(0, 5).join(', ')})`);
  else if (fresh.length > MAX_NEW_WORDS) why.push(`added ${fresh.length} new words (${fresh.slice(0, 5).join(', ')})`);

  return { ok: why.length === 0, why };
}
