/* Text helpers shared by matching and verification. Ported from Resumator's
   engine/util.js. */

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'into', 'is', 'it', 'its',
  'of', 'on', 'or', 'that', 'the', 'to', 'with', 'will', 'you', 'your', 'our', 'we', 'us', 'this', 'their', 'they',
  'who', 'what', 'when', 'which', 'able', 'across', 'also', 'using', 'use', 'used', 'including', 'etc', 'plus',
  'years', 'year', 'yrs', 'experience', 'strong', 'excellent', 'good', 'great', 'ability', 'work', 'working',
  'role', 'job', 'team', 'looking', 'someone', 'engineer', 'engineering', 'position', 'candidate',
]);

/** Lowercase, strip punctuation, collapse whitespace. */
export function norm(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9+#./' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return norm(text)
    .split(' ')
    .map((t) => t.replace(/^[./']+|[./']+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Does `phrase` occur in `haystack` (already normed and space-padded) as whole words? */
export function hasPhrase(padded: string, phrase: string): boolean {
  const p = norm(phrase);
  return !!p && padded.includes(` ${p} `);
}

export type Tf = Map<string, number>;

/** Term frequency with sublinear scaling. */
export function tf(tokens: string[]): Tf {
  const m: Tf = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  for (const [k, v] of m) m.set(k, 1 + Math.log(v));
  return m;
}

export function buildIdf(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = docs.length || 1;
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log((n + 1) / (c + 0.5)));
  return idf;
}

export function cosine(a: Tf, b: Tf, idf: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [t, v] of a) na += ((idf.get(t) ?? 1) * v) ** 2;
  for (const [t, v] of b) nb += ((idf.get(t) ?? 1) * v) ** 2;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, v] of small) {
    const o = large.get(t);
    if (o === undefined) continue;
    const i = idf.get(t) ?? 1;
    dot += i * v * (i * o);
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Every number-like token: 100 Hz, 0.56%, 31,000, 16B, 2024. */
export function extractNumbers(text: string): string[] {
  const out: string[] = [];
  /* Not inside a name: the 2 in wav2vec2 or DeepSeek-V2 is not a figure. */
  const re = /(?<![A-Za-z])(?:[$€£]\s?)?\d[\d,]*(?:\.\d+)?\s?(?:%|k|K|M|B|x|X|hz|Hz|HZ|ms|s|mb|MB|gb|GB|kb|KB|fps|\+)?(?![A-Za-z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0].trim().replace(/,$/, '');
    if (/^\d$/.test(raw) && Number(raw) <= 1) continue;
    out.push(raw);
  }
  return out;
}
