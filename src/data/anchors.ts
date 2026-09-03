/* Explicit .ts extensions, unlike the rest of src/ — this module is imported
   by bot/build-context.mjs under plain Node, whose ESM resolver has no
   bundler-style extension guessing. `allowImportingTsExtensions` is already
   on, so Vite and tsc are equally happy either way. */
import { experience } from './experience.ts';
import { projects, research } from './projects.ts';
import { publications } from './publications.ts';

/* Words that carry no identity, so a slug built from them tells you nothing. */
const NOISE = new Set([
  'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with',
]);

/**
 * Stable anchor slugs, shared by the pages that render `id=` and by
 * `bot/build-context.mjs`, which turns them into deep-link keys for the chat
 * bot. One function so a link the bot offers always finds a card that exists.
 *
 * Three words rather than two: the chat model picks a key off a list, and
 * `nsf-reu-consumer` vs `nsf-reu-ai` is a choice it can get right where
 * `nsf-reu` vs `nsf-reu-2` is a coin flip.
 */
export function slugsFor(titles: string[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w && !NOISE.has(w));

    let key = words.slice(0, 3).join('-') || 'item';
    for (let n = 2; used.has(key); n++) key = `${words.slice(0, 3).join('-')}-${n}`;

    used.add(key);
    out.set(title, key);
  }

  return out;
}

export const anchors = {
  experience: slugsFor(experience.map((r) => r.org)),
  projects: slugsFor(projects.map((p) => p.title)),
  research: slugsFor(research.map((p) => p.title)),
  publications: slugsFor(publications.map((p) => p.title)),
};
