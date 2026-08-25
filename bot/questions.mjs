#!/usr/bin/env node
/**
 * Reads bot/questions.jsonl and prints what visitors actually asked.
 *
 * The point is not the totals — it is the list at the bottom. A question the
 * bot gets asked repeatedly is a question the site should have answered on the
 * page, and every entry there is a small piece of free user research.
 *
 * Run:  npm run bot:questions [days]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, 'questions.jsonl');

if (!existsSync(file)) {
  console.log('No questions logged yet (bot/questions.jsonl does not exist).');
  process.exit(0);
}

const days = Number(process.argv[2] ?? 30);
const cutoff = Date.now() - days * 86_400_000;

const rows = readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter((r) => r && Date.parse(r.ts) >= cutoff);

if (!rows.length) {
  console.log(`Nothing in the last ${days} days.`);
  process.exit(0);
}

const count = (key) =>
  [...rows.reduce((m, r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1), new Map())].sort(
    (a, b) => b[1] - a[1],
  );

const visitors = new Set(rows.map((r) => r.visitor)).size;
const leads = rows.filter((r) => r.lead).length;
const jd = rows.filter((r) => r.mode === 'jd').length;
const errors = rows.filter((r) => r.error).length;
const timed = rows.filter((r) => r.ms).map((r) => r.ms).sort((a, b) => a - b);
const median = timed.length ? timed[Math.floor(timed.length / 2)] : 0;

console.log(`\nLast ${days} days\n${'─'.repeat(60)}`);
console.log(`  ${rows.length} questions from ${visitors} visitors`);
console.log(`  ${leads} lead${leads === 1 ? '' : 's'}, ${jd} job description${jd === 1 ? '' : 's'} matched`);
console.log(`  median reply ${(median / 1000).toFixed(1)}s${errors ? `, ${errors} failed` : ''}`);

console.log(`\nAsked from\n${'─'.repeat(60)}`);
for (const [page, n] of count('page').slice(0, 8)) {
  console.log(`  ${String(n).padStart(4)}  ${page ?? '(unknown)'}`);
}

/* Newest first: the tail is what you have not read yet. */
console.log(`\nQuestions, newest first\n${'─'.repeat(60)}`);
for (const r of rows.slice(-60).reverse()) {
  const when = new Date(r.ts).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  const tag = r.error ? ' [failed]' : r.lead ? ' [lead]' : r.mode === 'jd' ? ' [jd]' : '';
  const q = r.q.replace(/\s+/g, ' ').slice(0, 100);
  console.log(`  ${when}${tag}\n      ${q}${r.q.length > 100 ? '…' : ''}`);
}
console.log();
