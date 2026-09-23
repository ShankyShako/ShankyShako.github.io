/**
 * From a query to a ranked list of bullets, in plain JS so it can run on every
 * keystroke. No model is involved: this is what the page shows the moment you
 * type, and what it falls back to when the bot is offline.
 *
 * Scoring follows Resumator (engine/scoring.js): skill overlap, TF-IDF cosine,
 * and priority. A domain term is added because a query here is often three
 * words ("health startup") rather than a posting, and three words rarely name
 * a tool. Ranking is Resumator's greedy weighted set cover (engine/select.js),
 * without its line budget: the fit loop in layout.ts decides how many fit.
 */
import { DOMAINS, entries, fragments, sections, type Fragment, type SkillLine } from '../../data/resume.ts';
import { buildIdf, cosine, extractNumbers, hasPhrase, norm, tf, tokenize, type Tf } from './text.ts';

export type Req = { text: string; weight: number; tf: Tf; padded: string; domains: Set<string> };

const MUST = /\b(required|requirements?|must|minimum|you have|you bring|proven|qualifications)\b/i;
const NICE = /\b(preferred|nice to have|bonus|a plus|ideally|familiarity)\b/i;
const SKIP = /\b(benefits|perks|salary|compensation|equal opportunity|eeo|401k|pto|visa sponsorship|accommodations?|how to apply|apply now)\b/i;

const pad = (s: string) => ` ${norm(s)} `;

function domainsOf(padded: string): Set<string> {
  const out = new Set<string>();
  for (const [id, words] of Object.entries(DOMAINS)) {
    if (words.some((w) => hasPhrase(padded, w))) out.add(id);
  }
  return out;
}

/** A short query is one requirement. A pasted posting is one per line. */
export function parseQuery(query: string): Req[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const long = q.length > 160 || q.includes('\n');
  const parts = long
    ? q
        .split(/\n+|(?<=[.;])\s+/)
        .map((l) => l.replace(/^\s*[-•*▪·●–—]\s*/, '').trim())
        .filter((l) => l.length >= 12 && l.length <= 400 && !SKIP.test(l))
        .slice(0, 60)
    : [q];

  return parts.map((text) => {
    const padded = pad(text);
    return {
      text,
      weight: !long ? 1 : MUST.test(text) ? 3 : NICE.test(text) ? 1 : 1.5,
      tf: tf(tokenize(text)),
      padded,
      domains: domainsOf(padded),
    };
  });
}

const fragDocs = fragments.map((f) => tokenize(`${f.text} ${f.skills.join(' ')}`));
const fragTf = new Map(fragments.map((f, i) => [f.id, tf(fragDocs[i])]));
const fragById = new Map(fragments.map((f) => [f.id, f]));
const entryOf = new Map(entries.flatMap((e) => e.bullets.map((b) => [b, e] as const)));

export { fragById, entryOf };

/** How well one bullet answers one requirement, 0..1, before priority. */
function relevance(f: Fragment, r: Req, idf: Map<string, number>): number {
  const domain = r.domains.size ? [...r.domains].filter((d) => f.tags.includes(d)).length / r.domains.size : 0;
  const skillHits = f.skills.filter((s) => hasPhrase(r.padded, s)).length;
  const skill = Math.min(1, skillHits / 2);
  const semantic = cosine(r.tf, fragTf.get(f.id)!, idf);
  return 0.4 * domain + 0.3 * skill + 0.3 * Math.min(1, semantic * 1.6);
}

export type Ranking = {
  /** Every fragment id, most useful first. */
  order: string[];
  /** Weighted relevance to the whole query, 0..1, before priority. */
  score: Map<string, number>;
  /** True when the query hit anything at all. */
  matched: boolean;
};

export function rank(reqs: Req[]): Ranking {
  const idf = buildIdf([...fragDocs, ...reqs.map((r) => [...r.tf.keys()])]);
  const m = reqs.map((r) => new Map(fragments.map((f) => [f.id, relevance(f, r, idf)])));
  const totalW = reqs.reduce((s, r) => s + r.weight, 0) || 1;

  const score = new Map(
    fragments.map((f) => [f.id, reqs.reduce((s, r, i) => s + r.weight * m[i].get(f.id)!, 0) / totalW]),
  );

  /* Greedy set cover: each pick is worth what it adds over what is already
     covered, so five bullets proving the same requirement do not all win.
     Its own relevance counts too, or a three-word query (one requirement)
     would rank everything after the first pick by priority alone. Priority
     breaks ties and orders whatever the query did not touch. */
  const covered = reqs.map(() => 0);
  const left = new Set(fragments.map((f) => f.id));
  const order: string[] = [];
  while (left.size) {
    let best = '';
    let bestGain = -1;
    for (const id of left) {
      const gain =
        reqs.reduce((s, r, i) => s + r.weight * Math.max(0, m[i].get(id)! - covered[i]), 0) / totalW +
        0.5 * score.get(id)! +
        0.04 * (fragById.get(id)!.priority / 5);
      if (gain > bestGain) {
        best = id;
        bestGain = gain;
      }
    }
    left.delete(best);
    order.push(best);
    reqs.forEach((_, i) => (covered[i] = Math.max(covered[i], m[i].get(best)!)));
  }

  return { order, score, matched: [...score.values()].some((s) => s > 0.12) };
}

/* ---------------------------------------------------------------------------
 * Chips: the pile of terms on the stage. A chip rises when the query names it,
 * or when it belongs to a bullet the query made relevant.
 * ------------------------------------------------------------------------ */
export type Chip = { id: string; label: string; kind: 'skill' | 'number' | 'glyph' };

const skillLines = sections.flatMap((s) => s.lines ?? []);

function chipTerms(): Chip[] {
  const seen = new Map<string, Chip>();
  const add = (label: string, kind: Chip['kind']) => {
    const id = `${kind}:${norm(label)}`;
    if (!seen.has(id)) seen.set(id, { id, label, kind });
  };
  for (const f of fragments) f.skills.forEach((s) => add(s, 'skill'));
  for (const l of skillLines) [...l.items, ...(l.pool ?? [])].forEach((s) => add(s, 'skill'));
  for (const f of fragments) {
    if (f.fixed) continue;
    for (const n of extractNumbers(f.text)) if (n.length >= 3 && /[%.,]|hz|b$/i.test(n)) add(n, 'number');
  }
  return [...seen.values()];
}

/* Loose type for the heap. They never match; they are the letters, numbers,
   and specials a page is set from. */
const GLYPHS = 'GMλΣ∂%&#/+{}@∞π→017≈µθ∫Ω$?!ǝ§¶'.split('');

export const CHIPS: Chip[] = [...chipTerms(), ...GLYPHS.map((g, i) => ({ id: `glyph:${i}`, label: g, kind: 'glyph' as const }))];

/** Which fragments carry each chip, for the "relevant by association" path. */
const chipOwners = new Map<string, string[]>();
for (const c of CHIPS) {
  if (c.kind === 'glyph') continue;
  chipOwners.set(
    c.id,
    fragments
      .filter((f) => (c.kind === 'skill' ? f.skills.some((s) => norm(s) === norm(c.label)) : f.text.includes(c.label)))
      .map((f) => f.id),
  );
}

/**
 * Chips to lift, most relevant first: the ones the query names outright,
 * then the tools and figures of the best-matching bullets, in rank order.
 */
export function liftedChips(query: string, ranking: Ranking, max = 12): string[] {
  const padded = pad(query);
  const out: string[] = [];
  const add = (id: string) => out.length < max && !out.includes(id) && !!out.push(id);
  for (const c of CHIPS) if (c.kind === 'skill' && hasPhrase(padded, c.label)) add(c.id);
  if (!ranking.matched) return out;
  const best = ranking.score.get(ranking.order[0]) ?? 0;
  /* Three per bullet, so one tool-heavy bullet cannot take every slot. */
  for (const id of ranking.order.slice(0, 6)) {
    if (ranking.score.get(id)! < Math.max(0.12, best * 0.35)) break;
    let n = 0;
    for (const [chip, owners] of chipOwners) if (n < 3 && owners.includes(id) && !out.includes(chip)) n += add(chip) ? 1 : 0;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Skills rows: named items move to the front, and pool items the query names
 * are let in, at most two per row.
 * ------------------------------------------------------------------------ */
export function tailorSkillLines(query: string): SkillLine[] {
  const padded = pad(query);
  const hit = (s: string) => s.split(/\s*\/\s*|\s*\(\s*|\)/).some((p) => p && hasPhrase(padded, p));
  return skillLines.map((l) => {
    const promoted = (l.pool ?? []).filter(hit).slice(0, 2);
    const named = l.items.filter(hit);
    const rest = l.items.filter((s) => !named.includes(s));
    return { label: l.label, items: [...named, ...promoted, ...rest] };
  });
}
