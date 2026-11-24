/* The meet as a battle: CHAD against his evil twin. Pure rules only, so the
   numbers can be checked without the UI.

   Cred is HP. Each round is rock-paper-scissors; the winner picks the weight
   or hands the pick to the other side. Both lift it. Both make it or both
   miss it: even. One misses: they lose the stake. Picking is the gamble:
   the picker loses 1.5x the stake if they're the one who misses, and wins
   back half the stake if they make it while the other side misses. */

import { openers } from './engine';

export const PLAYER = 'CHAD';
export const FOE = 'DAHC';
export const START_CRED = 100;

export type Side = 'you' | 'foe';
export type Throw = 'rock' | 'paper' | 'scissors';
export const THROWS: Throw[] = ['rock', 'paper', 'scissors'];
const BEATS: Record<Throw, Throw> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

export function rps(you: Throw, foe: Throw): Side | 'tie' {
  if (you === foe) return 'tie';
  return BEATS[you] === foe ? 'you' : 'foe';
}

export const randomThrow = (r = Math.random()): Throw => THROWS[Math.min(2, Math.floor(r * 3))];

/** Light, Heavy, Max: the old openers (90 / 100 / 105% of max) and their
    stakes. Sized so a battle runs about 5-7 rounds (simulated). */
export const TIERS = [
  { name: 'Light', stake: 20 },
  { name: 'Heavy', stake: 30 },
  { name: 'Max', stake: 50 },
] as const;
export type Tier = 0 | 1 | 2;
export const tierWeights = (max: number) => openers(max);

/** The twin is greedy: mostly Heavy or Max, and more so when he's ahead. */
export function foePick(cred: { you: number; foe: number }, r = Math.random()): Tier {
  const p = cred.foe > cred.you ? [0.05, 0.4] : [0.15, 0.45];
  return r < p[0] ? 0 : r < p[0] + p[1] ? 1 : 2;
}

/** His chance to make a tier, a little better each meet. */
export const foeOdds = (tier: Tier, meet: number) => Math.min(0.95, [0.85, 0.65, 0.45][tier] + 0.02 * Math.min(meet, 10));

/** His lift, rolled: whether he made it and the judges' white lights. */
export function foeLift(tier: Tier, meet: number, r1 = Math.random(), r2 = Math.random()) {
  const made = r1 < foeOdds(tier, meet);
  const whites = made ? (r2 < 0.5 ? 3 : 2) : r2 < 0.5 ? 1 : 0;
  return { made, whites };
}

/** Cred changes for a round (negative is a loss). */
export function resolve(tier: Tier, picker: Side, youMade: boolean, foeMade: boolean): Record<Side, number> {
  const d = { you: 0, foe: 0 };
  if (youMade === foeMade) return d;
  const stake = TIERS[tier].stake;
  const loser: Side = youMade ? 'foe' : 'you';
  const winner: Side = youMade ? 'you' : 'foe';
  d[loser] = -Math.round(stake * (loser === picker ? 1.5 : 1));
  if (winner === picker) d[winner] = Math.round(stake / 2);
  return d;
}

export const applyCred = (cred: number, delta: number) => Math.max(0, Math.min(START_CRED, cred + delta));
