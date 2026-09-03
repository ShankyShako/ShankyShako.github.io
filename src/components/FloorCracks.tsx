import { useEffect, useRef, useState } from 'react';

/**
 * The floor under the deck.
 *
 * The crack is *drawn as it travels*. Every branch keeps a full route, and what
 * gets rendered is only the part its tip has reached so far — so the endpoints
 * walk outward, and a fork appears at the moment the tip passes the junction it
 * forks from, the way pressure finds somewhere new to go when it cannot keep
 * going straight. Scaling a finished shape was the wrong model: a zoom moves the
 * impact point and every tip at once, which reads as a picture being resized
 * rather than a floor giving way.
 *
 * The tip is always a point and the root is always the full width, so as a
 * branch extends its whole profile stretches with it and the crack gets deeper
 * behind the tip rather than uniformly fatter.
 *
 * Geometry is generated from a fixed seed, so the floor is identical on every
 * visit and adding a role does not redraw it.
 */

const VIEW = { w: 1000, h: 640, cx: 500, cy: 330 };

/* The camera looks straight down at a floor, so a fracture running "away"
   covers less screen than one running across it. */
const FLATTEN = 0.62;

const TRUNKS = 7;
const TRUNK_LEN = 300;
const TRUNK_W = 46;
const MAX_DEPTH = 2;

/* How thickness falls off along a crack. Used both to draw a branch and to work
   out how thick a fork should be where it leaves its parent — they have to be
   the same curve or the join steps. */
const TAPER = 1.2;
const taperAt = (frac: number) => Math.pow(1 - frac, TAPER);

/* A fork does not get its own budget of thickness — it takes a share of what
   the parent still had at that point, which is why the pair narrows rather than
   the split producing two fresh full-width cracks. */
const FORK_SHARE = 0.82;

/* The trunks are near-instant: the first card down has to land on a floor that
   is already properly broken, because that is this thing's *minimum* state. */
const ROOT_SPAN = 0.12;
/* Each generation takes longer than its parent, so the field is still finding
   new ground at the last card instead of finishing early. */
const SPAN_GROWTH = 2.2;

type Pt = [number, number];

/** mulberry32 — small, seeded, stable across browsers. */
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

type Branch = {
  pts: Pt[];
  /** Distance along the route at each point. */
  cum: number[];
  total: number;
  w: number;
  /** Progress at which this tip starts walking, and how long it walks for. */
  birth: number;
  span: number;
};

function buildTree(): Branch[] {
  const rand = rng(20200903);
  const out: Branch[] = [];

  const grow = (
    x: number,
    y: number,
    angle: number,
    len: number,
    w: number,
    depth: number,
    birth: number,
    span: number,
  ) => {
    /* Few, long, sharply-angled segments. Many small ones average out into a
       curve, and a crack does not curve — it goes straight until something
       makes it turn. */
    /* Enough segments that the outline follows the taper curve. With three, a
       branch is drawn as two long straight edges meeting at a point — which is
       a triangle, not a crack. */
    const steps = depth === 0 ? 7 : 5;
    const pts: Pt[] = [[x, y]];
    let cx = x;
    let cy = y;
    let ca = angle;

    for (let s = 0; s < steps; s++) {
      ca += (rand() - 0.5) * 0.8;
      const step = (len / steps) * (0.7 + rand() * 0.6);
      cx += Math.cos(ca) * step;
      cy += Math.sin(ca) * step * FLATTEN;
      pts.push([cx, cy]);
    }

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1] || 1;

    out.push({ pts, cum, total, w, birth, span });

    if (depth >= MAX_DEPTH) return;

    const kids = depth === 0 ? 2 : rand() < 0.55 ? 2 : 1;
    for (let k = 0; k < kids; k++) {
      /* Forks from the middle-to-late stretch of the parent, never at its tip.
         At the tip a parent has no width left to give and the branch comes out
         invisible; too early and the branch never gets past the parent's own
         reach, which stalls the whole field — the frontier has to keep moving
         outward for the later cards to add anything. */
      const j = 1 + Math.floor((0.4 + rand() * 0.4) * (pts.length - 2));
      const side = rand() < 0.5 ? -1 : 1;

      /* The fork opens exactly when the parent's tip passes this junction. */
      const childBirth = birth + span * (cum[j] / total);

      /* Start the fork at whatever the parent had left at that junction, rather
         than at a fresh fraction of the trunk width. A branch leaving a
         near-spent parent at full width is what made the forks read as separate
         triangles laid over the crack instead of the crack dividing. */
      const childW = w * taperAt(cum[j] / total) * FORK_SHARE;

      /* Below this it is a sliver nothing can see, and it would still cost a
         path and a per-frame rebuild. */
      if (childW < 1.2) continue;

      grow(
        pts[j][0],
        pts[j][1],
        ca + side * (0.45 + rand() * 0.6),
        len * 0.8,
        childW,
        depth + 1,
        childBirth,
        span * SPAN_GROWTH,
      );
    }
  };

  for (let i = 0; i < TRUNKS; i++) {
    /* Uneven spacing. Evenly spaced trunks are an asterisk. */
    const angle = (i / TRUNKS) * Math.PI * 2 + (rand() - 0.5) * 0.85;
    grow(
      VIEW.cx,
      VIEW.cy,
      angle,
      TRUNK_LEN * (0.78 + rand() * 0.44),
      TRUNK_W * (0.8 + rand() * 0.4),
      0,
      0,
      ROOT_SPAN * (0.8 + rand() * 0.4),
    );
  }

  return out;
}

const TREE = buildTree();

/**
 * The outline of however much of `b` has been travelled at `t`, as a wedge that
 * is full width at the root and converges to a point at the walking tip.
 */
function drawnWedge(b: Branch, t: number, pressure: number) {
  const reach = t * b.total;
  if (reach < 1) return '';

  const pts: Pt[] = [];
  for (let i = 0; i < b.pts.length; i++) {
    if (b.cum[i] <= reach) {
      pts.push(b.pts[i]);
      continue;
    }
    /* Partial segment: put the tip exactly where it has got to. */
    const prev = b.pts[i - 1];
    const f = (reach - b.cum[i - 1]) / (b.cum[i] - b.cum[i - 1]);
    pts.push([prev[0] + (b.pts[i][0] - prev[0]) * f, prev[1] + (b.pts[i][1] - prev[1]) * f]);
    break;
  }
  if (pts.length < 2) return '';

  const arc = [0];
  for (let i = 1; i < pts.length; i++) {
    arc.push(arc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const len = arc[arc.length - 1] || 1;

  const normals: Pt[] = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const c = pts[Math.min(pts.length - 1, i + 1)];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    return [-dy / m, dx / m];
  });

  /* Widens with the pile as well as with distance travelled: more weight on the
     slab means the same crack opens further, not just longer ones appearing. */
  const w = b.w * (0.72 + 0.5 * pressure);
  /* Same curve the forks are sized against, so a branch and the branches
     leaving it are continuous rather than stepped. */
  const half = (i: number) => (w / 2) * taperAt(arc[i] / len);

  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const left = pts.map((p, i) => [p[0] + normals[i][0] * half(i), p[1] + normals[i][1] * half(i)]);
  const right = pts.map((p, i) => [p[0] - normals[i][0] * half(i), p[1] - normals[i][1] * half(i)]);

  return `M${f(left[0])} ${left.slice(1).map((p) => `L${f(p)}`).join(' ')} ${right
    .slice()
    .reverse()
    .map((p) => `L${f(p)}`)
    .join(' ')} Z`;
}

/**
 * Eases towards `target` on rAF.
 *
 * The growth cannot be a CSS transition, because what changes between levels is
 * the path data itself. Tweening the progress value and rebuilding the geometry
 * each frame is what makes the tips travel rather than jump.
 */
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
};

export function FloorCracks({ progress }: Props) {
  const p = useTween(Math.max(0, Math.min(1, progress)), 1100);

  return (
    <svg
      className="deck-cracks"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {TREE.map((b, i) => {
        const t = Math.max(0, Math.min(1, (p - b.birth) / b.span));
        if (t <= 0) return null;
        const d = drawnWedge(b, t, p);
        return d ? <path key={i} d={d} /> : null;
      })}
    </svg>
  );
}
