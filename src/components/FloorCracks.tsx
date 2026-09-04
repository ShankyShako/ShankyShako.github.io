import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The floor under the deck — a fracture network, not a growth system.
 *
 * The distinction was the bug in every earlier version of this file. A tree
 * propagates: limbs subdivide at shallow angles, taper smoothly, recurse to a
 * uniform depth and never touch each other again. A failing slab does none of
 * that. Cracks run piecewise straight and kink; they split rarely, at wide
 * angles; they die at unequal lengths; and a crack that reaches an existing one
 * stops dead against it, which is what encloses plates of surface.
 *
 * Everything is anchored to the card. Seeds sit on its contact silhouette and
 * leave along the outward normal, headings are pulled back towards radial as
 * they run, and no crack may re-enter the footprint or reach the edge of the
 * frame — a crack arriving from off-screen reads as a root system, and one
 * starting in clear space reads as the card being placed next to damage rather
 * than causing it.
 *
 * Width is stress, not depth in a recursion: widest where the load bears,
 * hairline by a third of the way out, then near-constant until the last fifth
 * tapers away so the tip disappears into the surface.
 *
 * Geometry is seeded, so the floor is stable across visits; it is rebuilt only
 * when the card's measured footprint changes.
 */

const VIEW = { w: 1000, h: 640, cx: 500, cy: 320 };

/* The camera looks straight down, so a crack running "away" covers less screen
   than one running across. */
const FLATTEN = 0.66;

const SEG_MIN = 16;
const SEG_MAX = 46;
/* Per-segment wander. Enough to kink, never enough to curve. */
const KINK = 0.17;
/* How hard a crack is pulled back onto its radial line each segment. Without
   this they wander around the card and read as drift rather than a starburst. */
const RADIAL_PULL = 0.22;
const MAX_OFF_RADIAL = 0.7;

const SPLIT_CHANCE = 0.2;
const SPLIT_MIN = 0.7;
const SPLIT_MAX = 1.45;

const W_ORIGIN = [3.2, 4.8];
const W_TAIL = [0.7, 1.2];
const W_TIP = 0.22;
/* Stress drops over the first third; the last fifth tapers out. */
const DROP = 0.3;
const FADE = 0.8;

/* Cells form where the load actually bites. Past this band, cracks just run. */
const HUB_BAND = 155;

type Pt = [number, number];
type Seg = { a: Pt; b: Pt };
type Crack = { pts: Pt[]; w: number[]; birth: number; span: number };

export type Field = {
  /** Card contact silhouette, in viewBox units. */
  footW: number;
  footH: number;
  /** Visible slice of the viewBox, in viewBox units. */
  visW: number;
  visH: number;
};

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where a->b crosses c->d, as a fraction along a->b, or null. */
function hit(a: Pt, b: Pt, c: Pt, d: Pt) {
  const rx = b[0] - a[0];
  const ry = b[1] - a[1];
  const sx = d[0] - c[0];
  const sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  if (t < 0.06 || t > 1 || u < 0 || u > 1) return null;
  return t;
}

/** Signed shortest angle from `from` to `to`. */
function delta(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function buildNetwork(field: Field) {
  const rand = rng(20200903);
  const cracks: Crack[] = [];
  const placed: Seg[] = [];

  const hw = field.footW / 2;
  const hh = field.footH / 2;
  const L = VIEW.cx - hw;
  const R = VIEW.cx + hw;
  const T = VIEW.cy - hh;
  const B = VIEW.cy + hh;

  /* Nothing may reach the frame. A crack that touches the edge reads as one
     arriving from somewhere off-screen. */
  const inset = 34;
  const minX = VIEW.cx - field.visW / 2 + inset;
  const maxX = VIEW.cx + field.visW / 2 - inset;
  const minY = VIEW.cy - field.visH / 2 + inset;
  const maxY = VIEW.cy + field.visH / 2 - inset;

  /* Roughly 40% of the shorter side of the visible field. */
  const MAX_RUN = Math.min(field.visW, field.visH) * 0.4;

  const insideFoot = (p: Pt) => p[0] > L + 2 && p[0] < R - 2 && p[1] > T + 2 && p[1] < B - 2;
  const outOfFrame = (p: Pt) => p[0] < minX || p[0] > maxX || p[1] < minY || p[1] > maxY;

  /** Direction away from the card's centre, in unsquashed space. */
  const radialAt = (p: Pt) => Math.atan2((p[1] - VIEW.cy) / FLATTEN, p[0] - VIEW.cx);

  const run = (
    start: Pt,
    heading: number,
    wOrigin: number,
    budget: number,
    birth: number,
    span: number,
    depth: number,
    /* Cross-links aim at a target instead of radiating, and are allowed to
       start on top of another crack. */
    tangential = false,
  ) => {
    const pts: Pt[] = [start];
    const dists: number[] = [0];
    let angle = heading;
    let travelled = 0;
    /* Each crack keeps the radial line it left on, so it cannot curl back. */
    const anchor = radialAt(start);
    const forks: { at: Pt; angle: number; w: number; frac: number }[] = [];

    for (let i = 0; i < budget; i++) {
      if (!tangential) {
        /* Relax towards radial, then jitter. */
        angle += delta(angle, anchor) * RADIAL_PULL + (rand() - 0.5) * 2 * KINK;
        const off = delta(anchor, angle);
        if (Math.abs(off) > MAX_OFF_RADIAL) angle = anchor + Math.sign(off) * MAX_OFF_RADIAL;
      } else {
        angle += (rand() - 0.5) * 2 * KINK;
      }

      const len = Math.min(SEG_MIN + rand() * (SEG_MAX - SEG_MIN), MAX_RUN - travelled);
      if (len < 6) break;

      const from = pts[pts.length - 1];
      let to: Pt = [from[0] + Math.cos(angle) * len, from[1] + Math.sin(angle) * len * FLATTEN];

      /* Terminate on the first thing already there — the T-junction that closes
         the cells. */
      let nearest: number | null = null;
      for (const s of placed) {
        const t = hit(from, to, s.a, s.b);
        if (t !== null && (nearest === null || t < nearest)) nearest = t;
      }

      let dead = false;
      if (nearest !== null) {
        to = [from[0] + (to[0] - from[0]) * nearest, from[1] + (to[1] - from[1]) * nearest];
        dead = true;
      }
      if (insideFoot(to) || outOfFrame(to)) break;

      travelled += Math.hypot(to[0] - from[0], to[1] - from[1]);
      pts.push(to);
      dists.push(travelled);
      placed.push({ a: from, b: to });

      if (dead || travelled >= MAX_RUN) break;

      if (!tangential && depth < 2 && rand() < SPLIT_CHANCE) {
        const side = rand() < 0.5 ? -1 : 1;
        forks.push({
          at: to,
          angle: angle + side * (SPLIT_MIN + rand() * (SPLIT_MAX - SPLIT_MIN)),
          w: 0,
          frac: (i + 1) / budget,
        });
      }
    }

    if (pts.length < 2) return null;

    /* Width from stress along the finished run. */
    const total = dists[dists.length - 1] || 1;
    const wTail = W_TAIL[0] + rand() * (W_TAIL[1] - W_TAIL[0]);
    const w = dists.map((d) => {
      const f = d / total;
      let base: number;
      if (f < DROP) base = wOrigin + (wTail - wOrigin) * (f / DROP);
      else if (f < FADE) base = wTail;
      else base = wTail + (W_TIP - wTail) * ((f - FADE) / (1 - FADE));
      /* A real crack is not a uniform stroke. */
      return base * (0.86 + rand() * 0.28);
    });

    const crack: Crack = { pts, w, birth, span };
    cracks.push(crack);

    for (const f of forks) {
      const childBirth = birth + span * f.frac;
      if (childBirth > 0.95) continue;
      const idx = pts.findIndex((q) => q === f.at);
      const inherited = idx >= 0 ? w[idx] * 0.85 : wTail;
      run(f.at, f.angle, inherited, 1 + Math.floor(rand() * 5), childBirth, span * 1.3, depth + 1);
    }

    return crack;
  };

  /* ---- Seeds on the contact silhouette ----

     Corners take far more than edges: a rectangle pressed into a surface
     concentrates its load at the corners, and seeding evenly along the
     perimeter is what made the earlier field look like a halo. */
  type Seed = { p: Pt; normal: number; w: number };
  const seeds: Seed[] = [];
  const JITTER = 0.436; // ±25°

  const corners: [Pt, number][] = [
    [[L, B], Math.PI * 0.75],
    [[R, B], Math.PI * 0.25],
    [[L, T], Math.PI * 1.25],
    [[R, T], Math.PI * 1.75],
  ];
  for (const [c, n] of corners) {
    /* Bottom corners carry more — that is the edge the pile leans onto. */
    const count = c[1] === B ? 5 : 3;
    for (let k = 0; k < count; k++) {
      /* Slides along one of the two edges meeting at the corner, so the seed
         stays on the silhouette. Jittering both axes at once walked seeds off
         the rectangle entirely, and a crack starting in clear space next to the
         card is exactly the thing this is supposed to avoid. */
      const along = 8 + rand() * 26;
      const p: Pt =
        rand() < 0.5
          ? [c[0] + (c[0] === L ? along : -along), c[1]]
          : [c[0], c[1] + (c[1] === B ? -along : along)];
      seeds.push({ p, normal: n, w: 1 });
    }
  }

  const edge = (from: Pt, to: Pt, normal: number, n: number, weight: number) => {
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n + (rand() - 0.5) * 0.06;
      seeds.push({
        p: [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f],
        normal,
        w: weight,
      });
    }
  };
  edge([L, B], [R, B], Math.PI / 2, 5, 0.9);
  edge([L, T], [R, T], -Math.PI / 2, 3, 0.6);
  edge([L, T], [L, B], Math.PI, 3, 0.7);
  edge([R, T], [R, B], 0, 3, 0.7);

  const radials: Crack[] = [];
  seeds.forEach((s, i) => {
    const w = (W_ORIGIN[0] + rand() * (W_ORIGIN[1] - W_ORIGIN[0])) * s.w;
    /* Unequal runs — some die after a single segment. */
    const budget = 1 + Math.floor(Math.pow(rand(), 0.6) * 10);
    const c = run(
      s.p,
      s.normal + (rand() - 0.5) * 2 * JITTER,
      w,
      budget,
      (i / seeds.length) * 0.34,
      0.3 + rand() * 0.3,
      0,
    );
    if (c) radials.push(c);
  });

  /* ---- Cross-links, close in ----

     Short tangential cracks joining one radial to its neighbour, inside the
     band where the load actually bites. Both ends land on existing cracks, so
     each one closes a cell — and because they start on a crack rather than in
     clear space, none of them reads as a floating splinter. */
  const near = radials.filter((c) => {
    const p = c.pts[Math.min(1, c.pts.length - 1)];
    return Math.hypot(p[0] - VIEW.cx, (p[1] - VIEW.cy) / FLATTEN) < HUB_BAND + Math.max(hw, hh);
  });

  for (let i = 0; i < near.length; i++) {
    if (rand() > 0.55) continue;
    const a = near[i];
    const b = near[(i + 1 + Math.floor(rand() * 2)) % near.length];
    if (a === b) continue;

    const from = a.pts[1 + Math.floor(rand() * Math.max(1, a.pts.length - 1))];
    const to = b.pts[1 + Math.floor(rand() * Math.max(1, b.pts.length - 1))];
    if (!from || !to) continue;

    const gap = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (gap < 24 || gap > HUB_BAND) continue;

    run(
      from,
      Math.atan2((to[1] - from[1]) / FLATTEN, to[0] - from[0]),
      W_TAIL[1] * (0.9 + rand() * 0.5),
      3,
      0.4 + rand() * 0.4,
      0.26,
      2,
      true,
    );
  }

  return cracks;
}

/** One unbroken outline per crack: full width at the root, a point at the tip. */
function outline(pts: Pt[], w: number[], upto: number, scale: number) {
  const n = Math.min(pts.length, upto);
  if (n < 2) return '';

  const normals: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    normals.push([-dy / m, dx / m]);
  }

  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const half = (i: number) => (w[i] * scale) / 2;
  const left: number[][] = [];
  const right: number[][] = [];
  for (let i = 0; i < n; i++) {
    left.push([pts[i][0] + normals[i][0] * half(i), pts[i][1] + normals[i][1] * half(i)]);
    right.push([pts[i][0] - normals[i][0] * half(i), pts[i][1] - normals[i][1] * half(i)]);
  }

  return `M${f(left[0])}${left.slice(1).map((p) => `L${f(p)}`).join('')}${right
    .slice()
    .reverse()
    .map((p) => `L${f(p)}`)
    .join('')}Z`;
}

function shapesFor(network: Crack[], p: number, scale: number) {
  const out: string[] = [];
  for (const c of network) {
    const t = Math.max(0, Math.min(1, (p - c.birth) / c.span));
    if (t <= 0) continue;

    const reach = t * (c.pts.length - 1);
    const whole = Math.floor(reach);
    const frac = reach - whole;

    /* The revealed part of the same continuous route — never separate pieces. */
    const pts = c.pts.slice(0, whole + 1);
    const w = c.w.slice(0, whole + 1);
    if (frac > 0.02 && whole + 1 < c.pts.length) {
      const a = c.pts[whole];
      const b = c.pts[whole + 1];
      pts.push([a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]);
      w.push(c.w[whole] + (c.w[whole + 1] - c.w[whole]) * frac);
    }

    const d = outline(pts, w, pts.length, scale);
    if (d) out.push(d);
  }
  return out;
}

function useTween(target: number, ms: number) {
  const [value, setValue] = useState(target);
  const s = useRef({ from: target, to: target, at: 0, frame: 0, current: target });

  useEffect(() => {
    if (target === s.current.to) return;
    s.current.from = s.current.current;
    s.current.to = target;
    s.current.at = performance.now();

    const tick = () => {
      const k = Math.min(1, (performance.now() - s.current.at) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      s.current.current = s.current.from + (s.current.to - s.current.from) * eased;
      setValue(s.current.current);
      if (k < 1) s.current.frame = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(s.current.frame);
    s.current.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.current.frame);
  }, [target, ms]);

  return value;
}

type Props = {
  /** 0 = clean floor, 1 = fully fractured. */
  progress: number;
  field: Field;
};

export function FloorCracks({ progress, field }: Props) {
  const p = useTween(Math.max(0, Math.min(1, progress)), 1100);
  const network = useMemo(
    () => buildNetwork(field),
    [field.footW, field.footH, field.visW, field.visH],
  );
  const q = Math.round(p * 220) / 220;

  /* Three passes over one route. The core is the widest and sits underneath;
     the shadow and the rim are narrower and barely displaced, so they read as
     the walls of a groove rather than as a stick with a drop shadow. */
  const core = useMemo(() => shapesFor(network, q, 1), [network, q]);
  const shade = useMemo(() => shapesFor(network, q, 0.66), [network, q]);
  const rim = useMemo(() => shapesFor(network, q, 0.4), [network, q]);

  return (
    <svg
      className="deck-cracks"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="deck-crack-core">
        {core.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className="deck-crack-shadow">
        {shade.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className="deck-crack-rim">
        {rim.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
