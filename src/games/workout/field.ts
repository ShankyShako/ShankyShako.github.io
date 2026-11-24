/* Where the robots stand. They spread over the turf on both sides of the
   lifter in two loose rows (front and back), smaller the further back they
   stand, and bigger the higher their tier. Pure: WorkoutGame measures the
   stage and passes it in. */

/** Height of each tier relative to a Robo-Helper's base height. */
export const TIER_SCALE = [0.78, 0.94, 1.1, 1.28];

/** Sprite aspect (width / height) of robot-1.webp and robot-2.webp. */
const ASPECT = 253 / 300;
/** The turf in GymBackdrop's 1600 × 1000 viewBox is 394 units tall, bottom-anchored with xMidYMax slice. */
const TURF = 394;
/** Never more sprites than this; the Robots tile has the full count. */
const MAX_SHOWN = 10;

export type Stage = {
  /** Scene size, px. */
  w: number;
  h: number;
  /** Lifter box, px from the scene's left edge. */
  lifterL: number;
  lifterR: number;
  /** Panels that sit on the floor (sound controls, the phone tab bar), scene px. */
  blocks: { l: number; r: number; top: number }[];
  /** Base robot height (a tier-1.0 robot at the front), px. */
  rh: number;
  pad: number;
};

export type Bot = { tier: number; x: number; bottom: number; height: number; z: number };

/** Which tiers get a sprite: every owned tier at least once, biggest first,
    then the rest filled from the cheapest tier up. */
export function pickBots(robots: number[], max: number): number[] {
  const left = robots.slice();
  const picks: number[] = [];
  for (let t = left.length - 1; t >= 0 && picks.length < max; t--)
    if (left[t] > 0) {
      picks.push(t);
      left[t]--;
    }
  let added = true;
  while (picks.length < max && added) {
    added = false;
    for (let t = 0; t < left.length && picks.length < max; t++)
      if (left[t] > 0) {
        picks.push(t);
        left[t]--;
        added = true;
      }
  }
  return picks.sort((a, b) => b - a);
}

/* Small fixed wobble so the rows don't look ruled: same robot, same spot. */
const jitter = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
};

type Zone = { l: number; r: number; floor: number; rows: 1 | 2 };

export function layoutBots(robots: number[], st: Stage): Bot[] {
  const total = robots.reduce((a, b) => a + b, 0);
  if (!total || st.w <= 0) return [];

  const field = TURF * Math.max(st.w / 1600, st.h / 1000);
  const avgW = st.rh * 0.95 * ASPECT;
  const floorUnder = (l: number, r: number, base: number) =>
    st.blocks.reduce((f, b) => (b.r > l && b.l < r ? Math.max(f, st.h - b.top + 8) : f), base);

  /* Turf left and right of the lifter; if neither fits a robot (phones),
     one row across the whole stage in front of the lifter. */
  const base = Math.max(8, st.h * 0.02);
  let zones: Zone[] = [
    /* Right side first: with one robot it stands where the ghost was. */
    { l: st.lifterR + 6, r: st.w - st.pad, floor: 0, rows: 2 as const },
    { l: st.pad, r: st.lifterL - 6, floor: 0, rows: 2 as const },
  ].filter((z) => z.r - z.l >= avgW * 1.3);
  if (!zones.length) zones = [{ l: st.pad, r: st.w - st.pad, floor: 0, rows: 1 }];
  zones.forEach((z) => (z.floor = floorUnder(z.l, z.r, base)));

  const perRow = (z: Zone) => Math.max(1, Math.floor((z.r - z.l) / (avgW * 1.25)));
  const caps = zones.map((z) => perRow(z) * z.rows);
  const capTotal = caps.reduce((a, b) => a + b, 0);
  const picks = pickBots(robots, Math.min(MAX_SHOWN, capTotal));

  /* Share the picks out by room, biggest tier first, so each side gets a mix. */
  const groups: number[][] = zones.map(() => []);
  picks.forEach((t) => {
    let best = 0;
    let bestFree = -Infinity;
    zones.forEach((_, i) => {
      const free = (caps[i] - groups[i].length) / caps[i];
      if (groups[i].length < caps[i] && free > bestFree) {
        bestFree = free;
        best = i;
      }
    });
    groups[best].push(t);
  });

  const bots: Bot[] = [];
  let n = 0;
  zones.forEach((z, zi) => {
    const g = groups[zi];
    const front = z.rows === 1 ? g : g.filter((_, i) => i % 2 === 0);
    const back = z.rows === 1 ? [] : g.filter((_, i) => i % 2 === 1);
    const span = Math.max(0, field - 24 - z.floor);
    const place = (row: number[], isBack: boolean) =>
      row.forEach((tier, i) => {
        const k = n++;
        const d = z.rows === 1 ? 0 : isBack ? 0.5 + 0.18 * (jitter(k, 2) + 0.5) : 0.04 + 0.12 * (jitter(k, 2) + 0.5);
        const height = st.rh * TIER_SCALE[tier] * (1 - 0.32 * d);
        const half = (height * ASPECT) / 2;
        /* Front and back robots take turns along the zone, so they zig-zag
           rather than stand in columns. */
        const slots = z.rows === 1 ? row.length : g.length;
        const step = (z.r - z.l) / slots;
        const at = (z.rows === 1 ? i : 2 * i + (isBack ? 1 : 0)) * step + step / 2;
        const x = z.l + at + (z.rows === 1 ? 0 : jitter(k, 1) * step * 0.3);
        const bottom = z.floor + d * span;
        bots.push({
          tier,
          x: Math.min(z.r - half, Math.max(z.l + half, x)),
          bottom: Math.round(bottom),
          height: Math.round(height),
          z: Math.round(400 - bottom),
        });
      });
    place(back, true);
    place(front, false);
  });
  return bots;
}
