/* Workout Simulator: the rules and numbers, with no React and no DOM, so the
   pacing simulation can import this file in Node as is. Keep it to erasable
   TypeScript (no enums), so Node can strip the types. */

export const SAVE_KEY = 'workout-sim:v1';
/** One beat of the approach ring. */
export const BEAT_MS = 1000;
/** A rep's animation: lowered, then pressed. Taps inside it are buffered. */
export const REP_MS = 180;
/** Robots pay out once per cycle, as the 2021 Robo-Helper did. */
export const ROBOT_CYCLE_S = 5;

export const GOOD_MS = 150;
const PERFECT_MS = 70;
const PERFECT_MS_DRILLED = 100;
const GOOD_MULT = 2;
/* Whole numbers only, so a rep reads as a plain count: off-beat ×1, Good ×2,
   Perfect ×5 (×7 with Explosive Press). A masher at ~5 taps a second still
   earns well under a rhythm player (see the pacing sim). */
export const OFF_MULT = 1;
const STREAK_STEP = 0.1;
const MEDAL_BONUS = 0.1;
const OFFLINE_RATE = 0.5;

export type Judge = 'perfect' | 'good' | 'off';
export type TechId = 'window' | 'mirror' | 'cap' | 'power';
export type PerkId = 'chalk' | 'offline' | 'crew';

export type Away = { seconds: number; reps: number; gains: number };

export type State = {
  v: 1;
  gains: number;
  /** Gains earned this run: sets the body stage and unlocks the next meet. */
  runGains: number;
  equip: number;
  /** Count per robot tier. */
  robots: number[];
  tech: TechId[];
  streak: number;
  medals: number;
  /** Index of the next meet on the ladder. */
  meet: number;
  perks: PerkId[];
  bestLift: number;
  reps: number;
  /** Sound effects and the music loop: separate, both off by default. */
  sound: boolean;
  music: boolean;
  lastSeen: number;
  /** Offline gains waiting for the Collect button. */
  away: Away | null;
  /** Set once a meet's first attempt is judged. A reload mid-meet forfeits
      it (no lift) instead of letting the meet be re-rolled. */
  inMeet: boolean;
};

export const fresh = (): State => ({
  v: 1,
  gains: 0,
  runGains: 0,
  equip: 0,
  robots: [0, 0, 0, 0],
  tech: [],
  streak: 0,
  medals: 0,
  meet: 0,
  perks: [],
  bestLift: 0,
  reps: 0,
  sound: false,
  music: false,
  lastSeen: Date.now(),
  away: null,
  inMeet: false,
});

const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : d);

/** A save from localStorage, checked field by field. Anything odd falls back. */
export function restore(raw: unknown): State {
  const s = fresh();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return s;
  s.gains = num(r.gains, 0);
  s.runGains = num(r.runGains, 0);
  s.equip = Math.floor(num(r.equip, 0));
  if (Array.isArray(r.robots)) s.robots = ROBOTS.map((_, i) => Math.floor(num((r.robots as unknown[])[i], 0)));
  if (Array.isArray(r.tech)) s.tech = TECH.map((t) => t.id).filter((id) => (r.tech as unknown[]).includes(id));
  s.medals = Math.floor(num(r.medals, 0));
  s.meet = Math.floor(num(r.meet, 0));
  if (Array.isArray(r.perks)) s.perks = PERK_IDS.filter((id) => (r.perks as unknown[]).includes(id));
  s.bestLift = num(r.bestLift, 0);
  s.reps = Math.floor(num(r.reps, 0));
  s.sound = r.sound === true;
  s.music = r.music === true;
  s.lastSeen = num(r.lastSeen, Date.now());
  s.inMeet = r.inMeet === true;
  const a = r.away as Record<string, unknown> | null;
  if (a && typeof a === 'object') s.away = { seconds: num(a.seconds, 0), reps: num(a.reps, 0), gains: num(a.gains, 0) };
  return s;
}

/* ---------- Equipment: click power, a named ladder ---------- */

const EQUIP_NAMES = ['Chalk', 'Wrist Wraps', 'Lifting Belt', 'Knee Sleeves', 'Bench Shirt', 'Gold Plates'];
const EQUIP_BONUS = [1, 1, 2, 3, 5, 8];
/** Buying this one switches the lifter to the yellow-plate sprites. */
export const GOLD_INDEX = 5;

export const equipName = (i: number) => EQUIP_NAMES[i] ?? `Plate +${i - GOLD_INDEX}`;
export const equipBonus = (i: number) => EQUIP_BONUS[i] ?? Math.round(8 * 1.3 ** (i - GOLD_INDEX));
export const equipCost = (i: number) => Math.round((20 * 2.3 ** i) / 5) * 5;
export const hasGold = (s: State) => s.equip > GOLD_INDEX;

/** Base value of a rep before judgement, streak and medals. */
export function repBase(s: State) {
  let v = 1;
  for (let i = 0; i < s.equip; i++) v += equipBonus(i);
  return v;
}

/* ---------- Robots: idle Gains every 5 s ---------- */

export const ROBOTS = [
  { name: 'Robo-Helper', base: 5, out: 1 },
  { name: 'Spotter Bot', base: 60, out: 8 },
  { name: 'Rack Hauler', base: 700, out: 64 },
  { name: 'Titan Frame', base: 8000, out: 512 },
];
/** At this many Robo-Helpers they become the Model S (the 2021 sprite swap). */
export const MODEL_S_AT = 10;

export const robotCost = (tier: number, owned: number) => Math.ceil(ROBOTS[tier].base * 1.15 ** owned);
export const robotCount = (s: State) => s.robots.reduce((a, b) => a + b, 0);

/** Gains per robot cycle, before medals and streak mirroring. */
const robotBase = (s: State) => s.robots.reduce((a, n, t) => a + n * ROBOTS[t].out, 0);

export const medalMult = (s: State) => 1 + MEDAL_BONUS * s.medals;

/** Gains one robot cycle pays, with the streak mirror if learned. */
export function robotPayout(s: State) {
  const mirror = s.tech.includes('mirror') ? 0.25 * streakBonus(s) : 0;
  return Math.max(1, Math.round(robotBase(s) * medalMult(s) * (1 + mirror)));
}
export const robotRate = (s: State) => robotPayout(s) / ROBOT_CYCLE_S;

/* ---------- Technique: one-time buys, this run only ---------- */

export const TECH: { id: TechId; name: string; effect: string; cost: number }[] = [
  { id: 'window', name: 'Timing Drills', effect: 'Perfect window ±70 → ±100 ms', cost: 150 },
  { id: 'mirror', name: 'Robot Mirroring', effect: 'Robots copy your streak bonus at 25%', cost: 900 },
  { id: 'cap', name: 'Endurance Sets', effect: 'Streak cap 10 → 15 (up to +150%)', cost: 2500 },
  { id: 'power', name: 'Explosive Press', effect: 'Perfect reps ×5 → ×7', cost: 6000 },
];
/** A drill shows in the shop once this run has earned this share of its cost. */
export const TECH_REVEAL = 0.4;

export const perfectWindow = (s: State) => (s.tech.includes('window') ? PERFECT_MS_DRILLED : PERFECT_MS);
export const streakCap = (s: State) => (s.tech.includes('cap') ? 15 : 10);
export const perfectMult = (s: State) => (s.tech.includes('power') ? 7 : 5);
export const streakBonus = (s: State, streak = s.streak) => Math.min(streak, streakCap(s)) * STREAK_STEP;

/* ---------- A rep ---------- */

/** Judges a tap at time `t` against the beat clock that started at `t0`.
    Each beat can be hit once: a second tap on a beat already hit is off-beat. */
export function judgeTap(t: number, t0: number, lastBeat: number, s: State): { judge: Judge; beat: number } {
  const k = Math.round((t - t0) / BEAT_MS);
  const off = Math.abs(t - t0 - k * BEAT_MS);
  if (k === lastBeat || off > GOOD_MS) return { judge: 'off', beat: lastBeat };
  return { judge: off <= perfectWindow(s) ? 'perfect' : 'good', beat: k };
}

export const judgeMult = (s: State, j: Judge) => (j === 'perfect' ? perfectMult(s) : j === 'good' ? GOOD_MULT : OFF_MULT);

/** Applies one rep. `broke` is the streak that just ended (0 if none). */
export function rep(s: State, j: Judge): { s: State; gain: number; broke: number } {
  let streak = s.streak;
  let broke = 0;
  if (j === 'perfect') streak += 1;
  else if (j === 'off') {
    broke = streak;
    streak = 0;
  }
  const gain = Math.max(1, Math.round(repBase(s) * judgeMult(s, j) * (1 + streakBonus(s, streak)) * medalMult(s)));
  return {
    s: { ...s, streak, gains: s.gains + gain, runGains: s.runGains + gain, reps: s.reps + 1 },
    gain,
    broke,
  };
}

/* ---------- Buying ---------- */

export function buyEquip(s: State): State | null {
  const c = equipCost(s.equip);
  if (s.gains < c) return null;
  return { ...s, gains: s.gains - c, equip: s.equip + 1 };
}

export function buyRobot(s: State, tier: number): State | null {
  const c = robotCost(tier, s.robots[tier]);
  if (s.gains < c) return null;
  const robots = s.robots.slice();
  robots[tier] += 1;
  return { ...s, gains: s.gains - c, robots };
}

export function buyTech(s: State, id: TechId): State | null {
  const t = TECH.find((x) => x.id === id);
  if (!t || s.tech.includes(id) || s.gains < t.cost) return null;
  return { ...s, gains: s.gains - t.cost, tech: [...s.tech, id] };
}

/** A robot tier shows once the one before it is owned (the first always shows). */
export const robotVisible = (s: State, tier: number) =>
  tier === 0 || s.robots[tier - 1] > 0 || s.runGains >= ROBOTS[tier].base * 0.5;

/* ---------- Body stage and the lifter's max ---------- */

export type Body = 'weakling' | 'normal' | 'strong';
/** The 2021 rule: below half the meet's requirement, at half, at full. */
export function bodyStage(s: State): Body {
  const req = meetReq(s.meet);
  return s.runGains >= req ? 'strong' : s.runGains >= req / 2 ? 'normal' : 'weakling';
}

const round5 = (x: number) => Math.round(x / 5) * 5;
const round25 = (x: number) => Math.round(x / 2.5) * 2.5;

/** The lifter's 1RM in lb: equipment, medals and this run's Gains. */
export const maxLb = (s: State) =>
  round5(95 + 10 * s.equip + 5 * s.medals + 15 * Math.log10(1 + s.runGains));

/* ---------- Gym TV tapes: the owner's Flipnotes, one more per meet ---------- */

export const TAPES = [
  'Ei9tXoreNMQ',
  'Ln_TDGKcK6o',
  'uyNAC5RpPKM',
  'vXC0QB45ntw',
  'iKox0rqKU7w',
  'lLiFBqxT8bE',
  '9CYdax6VG6w',
  'Jd02GBTYWzI',
  'w8rX0aPw3js',
];
export const tapesUnlocked = (s: State) => Math.min(TAPES.length, 3 + s.meet);

/* ---------- Meets (prestige) ---------- */

const MEET_NAMES = ['Local', 'County', 'State', 'Regional', 'National', 'World'];
export const meetName = (i: number) => (i < MEET_NAMES.length ? `${MEET_NAMES[i]} Meet` : `Open #${i - MEET_NAMES.length + 1}`);

const MEET_REQ0 = 500000;
const MEET_GROWTH = 3;
/** Gains this run needed to enter meet `i`, rounded to two significant figures. */
export function meetReq(i: number) {
  const r = MEET_REQ0 * MEET_GROWTH ** i;
  const p = 10 ** (Math.floor(Math.log10(r)) - 1);
  return Math.round(r / p) * p;
}

export const meetOpen = (s: State) => s.runGains >= meetReq(s.meet);

export type Attempt = { weight: number; whites: number; made: boolean };

/** The three suggested openers: safe, solid, reach. */
export const openers = (max: number) => [0.9, 1, 1.05].map((k) => round25(max * k));

/** After a make you may go heavier; after a miss you retry the same weight. */
export function nextWeights(max: number, last: Attempt): number[] {
  if (!last.made) return [last.weight];
  return [0.025, 0.05, 0.1].map((k) => round25(last.weight + max * k));
}

/** The press meter for a weight: a narrower zone and a faster needle the
    heavier it is against your max, and a bit of both per meet tier. */
export function pressMeter(weight: number, max: number, meet: number) {
  const r = weight / max;
  const d = 1 + 0.06 * Math.min(meet, 15);
  const width = Math.min(0.34, Math.max(0.07, 0.34 - (r - 0.9) * 1.4)) / d;
  const sweepS = Math.min(1.3, Math.max(0.5, 1.25 - (r - 0.9) * 3)) / d;
  return { width, sweepS };
}

/** White lights for a stop at `pos` with the zone centred on `centre`. Two or
    three whites is a good lift. */
export function judgeLights(pos: number, centre: number, width: number) {
  const d = Math.abs(pos - centre);
  const half = width / 2;
  return d <= half * 0.55 ? 3 : d <= half ? 2 : d <= half + 0.05 ? 1 : 0;
}

const PERK_IDS: PerkId[] = ['chalk', 'offline', 'crew'];
export const PERKS: Record<PerkId, string> = {
  chalk: 'Start each run with Chalk',
  offline: 'Offline cap +2 h',
  crew: 'Start each run with 3 Robo-Helpers',
};
/** Placing at the first three meets unlocks one perk each. */
const MEET_PERK: (PerkId | undefined)[] = ['chalk', 'offline', 'crew'];

export type MeetResult = { place: 0 | 1 | 2 | 3; medals: number; perk: PerkId | null; best: number };

export function meetResult(s: State, max: number, attempts: Attempt[]): MeetResult {
  const made = attempts.filter((a) => a.made);
  const best = made.reduce((m, a) => Math.max(m, a.weight), 0);
  const r = best / max;
  const place = made.length === 0 ? 0 : r >= 1.05 ? 1 : r >= 1 ? 2 : 3;
  const base = [0, 3, 2, 1][place];
  /* No lift still pays one medal, so a meet is never a dead end. */
  const medals = place === 0 ? 1 : (base + made.length) * (1 + s.meet);
  const p = MEET_PERK[s.meet];
  const perk = place > 0 && p && !s.perks.includes(p) ? p : null;
  return { place: place as MeetResult['place'], medals, perk, best };
}

/** A meet left mid-way (a reload): scored as no lift. */
export const FORFEIT: MeetResult = { place: 0, medals: 1, perk: null, best: 0 };

/** A new run after a meet. Medals and perks stay; the rest goes to 0. */
export function newRun(s: State, res: MeetResult): State {
  const perks = res.perk ? [...s.perks, res.perk] : s.perks;
  return {
    ...s,
    gains: 0,
    runGains: 0,
    equip: perks.includes('chalk') ? 1 : 0,
    robots: [perks.includes('crew') ? 3 : 0, 0, 0, 0],
    tech: [],
    streak: 0,
    medals: s.medals + res.medals,
    meet: s.meet + 1,
    perks,
    bestLift: Math.max(s.bestLift, res.best),
    inMeet: false,
  };
}

/* ---------- Offline ---------- */

export const offlineCapS = (s: State) => (4 + (s.perks.includes('offline') ? 2 : 0)) * 3600;

/** Robots keep lifting at half rate while you're away, up to the cap. */
export function offline(s: State, now: number): Away | null {
  const gone = (now - s.lastSeen) / 1000;
  const n = robotCount(s);
  if (gone < 60 || n === 0) return null;
  const cycles = Math.floor(Math.min(gone, offlineCapS(s)) / ROBOT_CYCLE_S);
  return {
    seconds: Math.min(gone, offlineCapS(s)),
    reps: cycles * n,
    gains: Math.round(cycles * robotBase(s) * medalMult(s) * OFFLINE_RATE),
  };
}

/* ---------- Numbers ---------- */

/** 950, 1.2K, 34K, 5.6M, 7.8B, then 1.2e12. */
export function fmt(n: number) {
  if (n < 1000) return String(Math.floor(n));
  if (n >= 1e12) return n.toExponential(1).replace('e+', 'e');
  const units = ['K', 'M', 'B'];
  let u = -1;
  while (n >= 1000 && u < 2) {
    n /= 1000;
    u++;
  }
  const s = n >= 100 ? String(Math.floor(n)) : (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return s + units[u];
}

/** Like fmt, with one decimal under 10 (rates and small rep values). */
export const fmtRate = (n: number) => (n < 10 && !Number.isInteger(n) ? (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, '') : fmt(n));

export function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${Math.max(1, m)} min`;
}
