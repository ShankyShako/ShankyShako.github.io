/**
 * Downsizes the experience logo masters into the shipped set.
 *
 *   assets-src/experience/*.{png,jpg}  ->  public/image/experience/<slug>.png
 *
 * The masters are print-resolution — the NSF seal alone is 5100px square — and
 * the deck renders them at around 40px. Shipping them raw is a couple of
 * megabytes of decoration on one route. Same split as scripts/prep-pet.py:
 * masters stay local (assets-src/ is gitignored), the generated set is what
 * gets committed.
 *
 * Uses sips, which every Mac has, so adding a role needs no toolchain. sips
 * cannot write WebP; if `sharp` is ever installed this switches to WebP on its
 * own and roughly halves the output again.
 *
 *   npm run logos          # only what changed
 *   npm run logos -- --all # rebuild everything
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const SRC = 'assets-src/experience';
const OUT = 'public/image/experience';
const MAX = 240;
const force = process.argv.includes('--all');

/* Master filenames are whatever the source institution happened to call them —
   spaces, "300dpi", "-2" suffixes. The site should not have to know that. */
const slug = (f) =>
  basename(f, extname(f))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-?(\d+)?(dpi|ppi)-?\d*$/, '')
    .replace(/^-+|-+$/g, '');

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  /* Expected. sips path below. */
}
const ext = sharp ? 'webp' : 'png';

if (!existsSync(SRC)) {
  console.error(`No ${SRC}/ — masters are gitignored, so a fresh clone has none.`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const sources = readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f));
const keep = new Set();
let built = 0;

for (const file of sources) {
  const from = join(SRC, file);
  const to = join(OUT, `${slug(file)}.${ext}`);
  keep.add(basename(to));

  if (!force && existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue;

  if (sharp) {
    await sharp(from).resize({ width: MAX, height: MAX, fit: 'inside' }).webp({ quality: 82 }).toFile(to);
  } else {
    execFileSync('sips', ['-Z', String(MAX), '-s', 'format', 'png', from, '--out', to], {
      stdio: 'ignore',
    });
  }
  built++;
  console.log(`  ${file}  ->  ${basename(to)}  (${(statSync(to).size / 1024).toFixed(1)} KB)`);
}

/* A renamed or deleted master should not leave its old output behind to be
   silently referenced by experience.ts. */
for (const stale of readdirSync(OUT)) {
  if (!keep.has(stale)) {
    rmSync(join(OUT, stale));
    console.log(`  removed stale ${stale}`);
  }
}

const total = readdirSync(OUT).reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(
  `\n${built} built, ${sources.length - built} unchanged — ${(total / 1024).toFixed(0)} KB total via ${sharp ? 'sharp/webp' : 'sips/png'}`,
);
