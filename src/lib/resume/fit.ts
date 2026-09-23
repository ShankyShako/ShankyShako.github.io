/**
 * Fill one page, and only one, in ranking order.
 *
 * The pinned roles go in first with their minimum bullets. Then each bullet,
 * most useful first, is tried against the real layout plan and kept only if
 * the page still fits. A bullet too long for the space left is skipped, and a
 * shorter, less relevant one after it may still fit.
 */
import { entries, type Entry, type SkillLine } from '../../data/resume.ts';
import { buildPage, type PageSection, type Plan, type Typesetter } from './layout.ts';
import { entryOf, type Ranking } from './match.ts';

/* Without a cap, one role with many good bullets crowds out the rest. */
const maxOf = (e: Entry) => e.max ?? (e.section === 'projects' ? 2 : e.id === 'exp-ghw' ? 5 : 4);

/** `scale` < 1 only for a pinned page that runs over; the PDF uses the same. */
export type Fitted = { ids: string[]; page: PageSection[]; plan: Plan; scale: number };

export function fit(ts: Typesetter, ranking: Ranking, texts: Record<string, string>, skills: SkillLine[]): Fitted {
  if (ranking.pinned) {
    const page = buildPage(ranking.order, texts, skills);
    let scale = 1;
    let plan = ts.plan(page, scale);
    while (plan.height > plan.usable && scale > 0.9) plan = ts.plan(page, (scale -= 0.005));
    return { ids: ranking.order, page, plan, scale };
  }

  const pos = new Map(ranking.order.map((id, i) => [id, i]));
  const byRank = (ids: string[]) => [...ids].sort((a, b) => pos.get(a)! - pos.get(b)!);

  const chosen: string[] = [];
  for (const e of entries) {
    if (!e.always || !e.min) continue;
    chosen.push(...byRank(e.bullets).slice(0, e.min));
  }

  let page = buildPage(byRank(chosen), texts, skills);
  let plan = ts.plan(page);

  for (const id of ranking.order) {
    if (plan.height >= plan.usable * 0.985) break;
    if (chosen.includes(id)) continue;
    const e = entryOf.get(id)!;
    if (e.bullets.filter((b) => chosen.includes(b)).length >= maxOf(e)) continue;
    const tryIds = byRank([...chosen, id]);
    const tryPage = buildPage(tryIds, texts, skills);
    const tryPlan = ts.plan(tryPage);
    if (tryPlan.height <= tryPlan.usable) {
      chosen.push(id);
      page = tryPage;
      plan = tryPlan;
    }
  }
  return { ids: byRank(chosen), page, plan, scale: 1 };
}
