/**
 * Social scrapers (Twitter, LinkedIn, Slack, iMessage) do not run JavaScript,
 * so a pure SPA hands them all one set of tags. After `vite build` this writes
 * a copy of dist/index.html per route with that route's title/description/OG
 * baked in. Vercel serves the static file when it exists; React hydrates and
 * takes over from there. Also emits sitemap.xml and robots.txt.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ORIGIN = 'https://gmango.dev';

/* Read the route table straight out of the TS source so it never drifts. */
const siteSrc = readFileSync(join(root, 'src/data/site.ts'), 'utf8');
const routes = [...siteSrc.matchAll(
  /\{\s*path:\s*'([^']+)',\s*label:\s*'[^']+',\s*title:\s*'([^']+)',\s*\n?\s*description:\s*'([^']+)'\s*\}/g,
)].map(([, path, title, description]) => ({ path, title, description }));

if (routes.length === 0) {
  console.error('prerender-meta: no routes parsed from src/data/site.ts');
  process.exit(1);
}

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

for (const route of routes) {
  const url = ORIGIN + route.path;
  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(
      /(<meta name="description" content=")[^"]*(")/,
      `$1${esc(route.description)}$2`,
    )
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(
      /(<meta property="og:description" content=")[^"]*(")/,
      `$1${esc(route.description)}$2`,
    )
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
    .replace(
      /(<meta name="twitter:description" content=")[^"]*(")/,
      `$1${esc(route.description)}$2`,
    )
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  if (route.path === '/') {
    writeFileSync(join(dist, 'index.html'), html);
  } else {
    const dir = join(dist, route.path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
  }
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) =>
      `  <url><loc>${ORIGIN}${r.path}</loc><lastmod>${today}</lastmod>` +
      `<priority>${r.path === '/' ? '1.0' : '0.8'}</priority></url>`,
  )
  .join('\n')}
</urlset>
`,
);

writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
);

console.log(`prerender-meta: ${routes.length} routes, sitemap.xml, robots.txt`);
