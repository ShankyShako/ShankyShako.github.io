import { anchors } from './anchors.ts';
import { experience } from './experience.ts';
import { projects, research } from './projects.ts';
import { publications } from './publications.ts';

export type Entity = { aliases: string[]; href: string; label: string };

/**
 * Extra ways people (and the model) actually refer to each thing, beyond its
 * formal title. Keyed by the anchor slug so a rename in src/data surfaces here
 * as an obviously dead key rather than silently doing nothing.
 *
 * Deliberately conservative. A term that could mean two different entries —
 * "NSF REU", which is both the UMKC and the Mizzou role — is left out
 * entirely: a link to the wrong role is worse than no link.
 */
const EXTRA: Record<string, string[]> = {
  'geometry-health-wellness': ['Geometry Health', 'Geometry'],
  'afrl-sensors-directorate': [
    'AFRL',
    'Air Force Research Laboratory',
    'AFRL Sensors Directorate',
  ],
  'nsf-reu-ai': ['AI-Empowered Cybersecurity', 'the UMKC REU'],
  'nsf-reu-consumer': ['cybersickness', 'Consumer Networking'],
  'securing-virtual-reality': [
    'cybersickness attack',
    'IEEE TDSC',
    'Transactions on Dependable and Secure Computing',
  ],
  'nasa-missouri-space': ['NASA', 'Missouri Space Grant'],
  'spcn-2020-ieee': ['SPCN'],
  'ransomware-detection-critical': [
    'ransomware detection',
    'ransomware research',
    'IEEE Big Data',
  ],
  'dysarthria-speech-understanding': ['dysarthria', 'Team LEGACY', 'TORGO', 'UA-Speech'],
  'federated-blockchain-model': ['federated blockchain', 'model registry'],
  'aws-deepracer-reward': ['DeepRacer', 'AWS DeepRacer'],
  'racket-parser': [],
  'phonebook-management-system': ['phonebook'],
  'sos-game-implementation': ['SOS game'],
};

function build(): Entity[] {
  const out: Entity[] = [];

  const add = (slug: string | undefined, page: string, title: string) => {
    if (!slug) return;
    out.push({
      aliases: [title, ...(EXTRA[slug] ?? [])].filter(Boolean),
      href: `${page}#${slug}`,
      label: title,
    });
  };

  for (const r of experience) add(anchors.experience.get(r.org), '/experience', r.org.split(',')[0].trim());
  for (const p of publications) add(anchors.publications.get(p.title), '/research', p.title);
  for (const p of research) add(anchors.research.get(p.title), '/research', p.title);
  for (const p of projects) add(anchors.projects.get(p.title), '/projects', p.title);

  return out;
}

export const entities = build();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One regex over every alias, longest first so "AFRL Sensors Directorate" wins
 * over the bare "AFRL" sitting inside it.
 *
 * `\b` on both ends keeps "NASA" from matching inside a longer word. Aliases
 * that start or end in punctuation would break that, which is why none do.
 */
export const ENTITY_PATTERN = new RegExp(
  `\\b(${entities
    .flatMap((e) => e.aliases)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|')})\\b`,
  'gi',
);

/** Which entry an alias belongs to, lowercased for lookup. */
export const ENTITY_BY_ALIAS = new Map(
  entities.flatMap((e) => e.aliases.map((a) => [a.toLowerCase(), e] as const)),
);
