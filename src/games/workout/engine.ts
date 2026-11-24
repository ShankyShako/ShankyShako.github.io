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

/* ---------- Skill tree: equipment and technique on one hex map ----------
   Same upgrades, costs and effects as the old Equipment and Technique
   shops; the tree only adds prerequisites. Gear is still a count
   (`s.equip`), so gear nodes go in order; technique is still `s.tech`.
   Hex coordinates are axial (q, r) for flat-top hexes, the lifter at 0,0:
   the gear ring winds clockwise around the lifter from the top, technique
   hangs off it on the outer ring. */

export type NodeId = 'lifter' | 'chalk' | 'wraps' | 'belt' | 'sleeves' | 'shirt' | 'gold' | 'plates' | TechId;
export type NodeKind = 'root' | 'gear' | 'tech' | 'repeat';
export type TreeNode = {
  id: NodeId;
  kind: NodeKind;
  q: number;
  r: number;
  requires: NodeId[];
  /** Gear: its index on the equipment ladder. */
  gear?: number;
  /** Also needs at least one robot owned. */
  robot?: boolean;
};

export const TREE: TreeNode[] = [
  { id: 'lifter', kind: 'root', q: 0, r: 0, requires: [] },
  { id: 'chalk', kind: 'gear', gear: 0, q: 0, r: -1, requires: ['lifter'] },
  { id: 'wraps', kind: 'gear', gear: 1, q: 1, r: -1, requires: ['chalk'] },
  { id: 'belt', kind: 'gear', gear: 2, q: 1, r: 0, requires: ['wraps'] },
  { id: 'sleeves', kind: 'gear', gear: 3, q: 0, r: 1, requires: ['belt'] },
  { id: 'shirt', kind: 'gear', gear: 4, q: -1, r: 1, requires: ['sleeves'] },
  { id: 'gold', kind: 'gear', gear: GOLD_INDEX, q: -1, r: 0, requires: ['shirt'] },
  { id: 'plates', kind: 'repeat', q: -2, r: 1, requires: ['gold'] },
  { id: 'window', kind: 'tech', q: 1, r: -2, requires: ['chalk'] },
  { id: 'power', kind: 'tech', q: 2, r: -2, requires: ['window', 'wraps'] },
  { id: 'mirror', kind: 'tech', q: 2, r: -1, requires: ['belt'], robot: true },
  { id: 'cap', kind: 'tech', q: -1, r: 2, requires: ['sleeves'] },
];

export type NodeState = 'owned' | 'available' | 'locked' | 'hidden';

export const treeNode = (id: NodeId) => TREE.find((n) => n.id === id) as TreeNode;
const techOf = (id: NodeId) => TECH.find((t) => t.id === id);
/** Extra plates bought past Gold Plates. */
export const plateLevel = (s: State) => Math.max(0, s.equip - GOLD_INDEX - 1);

function isOwned(s: State, n: TreeNode) {
  if (n.kind === 'root') return true;
  if (n.kind === 'gear') return s.equip > (n.gear as number);
  if (n.kind === 'repeat') return plateLevel(s) > 0;
  return s.tech.includes(n.id as TechId);
}

/** Technique keeps the old shop's rule: it shows once this run has earned
    TECH_REVEAL of its cost. */
const revealed = (s: State, n: TreeNode) => n.kind !== 'tech' || s.runGains >= (techOf(n.id)?.cost ?? 0) * TECH_REVEAL;
const reqsOwned = (s: State, n: TreeNode) => n.requires.every((r) => isOwned(s, treeNode(r)));
const reqsMet = (s: State, n: TreeNode) => reqsOwned(s, n) && (!n.robot || robotCount(s) > 0);

/** owned: lit. available: buyable now (cost permitting). locked: a fog hex
    one step past what is available (or waiting on Gains or a robot).
    hidden: further out. The repeatable Plates node stays available. */
export function nodeState(s: State, id: NodeId): NodeState {
  const n = treeNode(id);
  if (n.kind === 'repeat') {
    if (reqsMet(s, n)) return 'available';
  } else if (isOwned(s, n)) return 'owned';
  if (reqsMet(s, n) && revealed(s, n)) return 'available';
  const near = n.requires.every((r) => {
    const st = nodeState(s, r);
    return st === 'owned' || st === 'available';
  });
  return near ? 'locked' : 'hidden';
}

export function nodeCost(s: State, id: NodeId) {
  const n = treeNode(id);
  if (n.kind === 'gear') return equipCost(n.gear as number);
  if (n.kind === 'repeat') return equipCost(Math.max(s.equip, GOLD_INDEX + 1));
  return techOf(id)?.cost ?? 0;
}

export const canBuy = (s: State, id: NodeId) => nodeState(s, id) === 'available' && s.gains >= nodeCost(s, id);

export function buyNode(s: State, id: NodeId): State | null {
  if (!canBuy(s, id)) return null;
  const n = treeNode(id);
  if (n.kind === 'gear' || n.kind === 'repeat') return buyEquip(s);
  return buyTech(s, id as TechId);
}

/** Nodes affordable right now: the shop tile's "3 ready". */
export const treeReady = (s: State) => TREE.filter((n) => canBuy(s, n.id)).length;

export function nodeName(s: State, id: NodeId) {
  const n = treeNode(id);
  if (n.kind === 'root') return 'Lifter';
  if (n.kind === 'gear') return equipName(n.gear as number);
  if (n.kind === 'repeat') return plateLevel(s) > 0 ? `Plates +${plateLevel(s)}` : 'Plates';
  return techOf(id)?.name ?? id;
}

export type NodeInfo = {
  id: NodeId;
  kind: NodeKind;
  name: string;
  state: NodeState;
  cost: number;
  /** What it does, in numbers for the current state. */
  lines: string[];
  /** Why it can't be bought yet, if locked. */
  need: string | null;
};

/** A Perfect rep's Gains at the current streak (the streak it would reach). */
const perfectRep = (s: State) =>
  Math.max(1, Math.round(repBase(s) * perfectMult(s) * (1 + streakBonus(s, s.streak + 1)) * medalMult(s)));

export function nodeInfo(s: State, id: NodeId): NodeInfo {
  const n = treeNode(id);
  const state = nodeState(s, id);
  const lines: string[] = [];
  const pct = (x: number) => `+${Math.round(x * 100)}%`;
  if (n.kind === 'root') {
    lines.push(`Rep base ${fmt(repBase(s))} before multipliers`);
    lines.push(`Perfect ×${perfectMult(s)} · Good ×${GOOD_MULT} · off-beat ×${OFF_MULT}`);
    lines.push(`Streak cap ${streakCap(s)} (up to ${pct(streakCap(s) * STREAK_STEP)}) · 1RM ${maxLb(s)} lb`);
  } else if (n.kind === 'gear' || n.kind === 'repeat') {
    const i = n.kind === 'gear' ? (n.gear as number) : Math.max(s.equip, GOLD_INDEX + 1);
    const b = equipBonus(i);
    if (state === 'owned') lines.push(`+${b} to every rep (owned)`);
    else if (i === s.equip) {
      lines.push(`Rep base ${fmt(repBase(s))} → ${fmt(repBase(s) + b)}`);
      lines.push(`1RM ${maxLb(s)} → ${maxLb({ ...s, equip: s.equip + 1 })} lb`);
    } else lines.push(`+${b} to every rep`);
    if (n.kind === 'repeat') lines.unshift(`Plates +${plateLevel(s)} → +${plateLevel(s) + 1}, buy again and again`);
    if (i === GOLD_INDEX) lines.push('Gold plates on the bar');
  } else if (id === 'window') {
    lines.push(`Perfect window ±${PERFECT_MS} → ±${PERFECT_MS_DRILLED} ms`);
    lines.push(`Good window stays ±${GOOD_MS} ms`);
  } else if (id === 'cap') {
    lines.push('Streak cap 10 → 15');
    lines.push(`Top streak bonus ${pct(10 * STREAK_STEP)} → ${pct(15 * STREAK_STEP)}`);
  } else if (id === 'power') {
    const has = s.tech.includes('power');
    const without = { ...s, tech: s.tech.filter((t) => t !== 'power') };
    lines.push('Perfect ×5 → ×7');
    lines.push(`A Perfect rep now: ${fmt(perfectRep(without))} → ${fmt(perfectRep({ ...without, tech: [...without.tech, 'power'] }))}${has ? ' (owned)' : ''}`);
  } else if (id === 'mirror') {
    lines.push(`Robots copy 25% of your streak bonus`);
    if (robotCount(s) > 0) {
      const full = { ...s, streak: streakCap(s), tech: s.tech.filter((t) => t !== 'mirror') };
      lines.push(`At a full streak: ${fmt(robotPayout(full))} → ${fmt(robotPayout({ ...full, tech: [...full.tech, 'mirror'] }))} every ${ROBOT_CYCLE_S} s`);
    }
  }
  let need: string | null = null;
  if (state === 'locked' || state === 'hidden') {
    const missing = n.requires.filter((r) => !isOwned(s, treeNode(r))).map((r) => nodeName(s, r));
    if (n.robot && robotCount(s) === 0) missing.push('a robot');
    if (missing.length) need = `Needs ${missing.join(' and ')}`;
    else if (!revealed(s, n)) need = `Opens after ${fmt(Math.ceil(nodeCost(s, id) * TECH_REVEAL))} Gains this run`;
  }
  return { id, kind: n.kind, name: nodeName(s, id), state, cost: nodeCost(s, id), lines, need };
}

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

/** The battle's three weights: Light, Heavy, Max (90 / 100 / 105% of max). */
export const openers = (max: number) => [0.9, 1, 1.05].map((k) => round25(max * k));

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

/** A battle's result: the cred you kept sets the place; a loss still pays
    one medal. Made lifts count up to three, as in the old three attempts. */
export function battleResult(s: State, won: boolean, credLeft: number, made: number[]): MeetResult {
  const best = made.reduce((m, w) => Math.max(m, w), 0);
  const place = !won ? 0 : credLeft >= 60 ? 1 : credLeft >= 30 ? 2 : 3;
  const base = [0, 3, 2, 1][place];
  const medals = place === 0 ? 1 : (base + Math.min(3, made.length)) * (1 + s.meet);
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
