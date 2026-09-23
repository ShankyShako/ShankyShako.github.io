import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Chip } from '../../lib/resume/match';

/**
 * The heap of type at the foot of the stage: every skill and number the resume
 * can print, mixed with loose letters and specials. When a query makes a chip
 * relevant it lifts out of the heap into a row under the search field, and
 * drops back when it stops being relevant.
 *
 * Positions are computed once per width (a seeded drop simulation) and every
 * move is a CSS transform, so the only per-keystroke work is picking targets.
 */

type Pos = { x: number; y: number; r: number };

/* Deterministic, so the heap is the same shape on every visit. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const COL = 4; // px per height-map column

/** Resting positions, with y measured up from the floor (so negative). */
function heap(sizes: { w: number; h: number }[], width: number, target?: number): Pos[] {
  const rand = rng(7);
  const cols = new Float32Array(Math.ceil(width / COL) + 1);
  const order = sizes.map((_, i) => i).sort(() => rand() - 0.5);
  /* How much each tile raises the heap. A narrow screen gets the same tiles
     packed tighter, so the heap stays a band instead of a whole
     phone screen: buried chips still lift out when they match. */
  const area = sizes.reduce((sum, s) => sum + s.w * s.h, 0);
  const depth = target ?? (width > 700 ? 400 : 130);
  const stack = Math.min(0.62, Math.max(0.12, (depth * width) / area));
  const out: Pos[] = new Array(sizes.length);
  for (const i of order) {
    const { w, h } = sizes[i];
    /* Of a few random drops, take the one that lands lowest: the heap fills
       its hollows and stays a low band, like the real thing. */
    let best = { x: 0, rest: Infinity };
    for (let t = 0; t < 10; t++) {
      const x = rand() * Math.max(1, width - w);
      const a = Math.floor(x / COL);
      const b = Math.ceil((x + w) / COL);
      let rest = 0;
      for (let c = a; c < b; c++) rest = Math.max(rest, cols[c]);
      if (rest < best.rest) best = { x, rest };
    }
    const a = Math.floor(best.x / COL);
    const b = Math.ceil((best.x + w) / COL);
    for (let c = a; c < b; c++) cols[c] = best.rest + h * stack;
    out[i] = { x: best.x, y: -best.rest - h, r: (rand() - 0.5) * 56 };
  }
  return out;
}

/** Lifted chips as centred rows starting at `top`. */
function rows(ids: string[], sizes: Map<string, { w: number; h: number }>, width: number, top: number) {
  const gap = 8;
  const maxW = Math.min(width - 24, 760);
  const lines: { ids: string[]; w: number }[] = [];
  for (const id of ids) {
    const s = sizes.get(id);
    if (!s) continue;
    const line = lines[lines.length - 1];
    if (line && line.w + gap + s.w <= maxW) { line.ids.push(id); line.w += gap + s.w; }
    else if (lines.length < 3) lines.push({ ids: [id], w: s.w }); // more would run into the heap
  }
  const out = new Map<string, Pos>();
  lines.forEach((line, n) => {
    let x = (width - line.w) / 2;
    for (const id of line.ids) {
      const s = sizes.get(id)!;
      out.set(id, { x, y: top + n * 42, r: 0 });
      x += s.w + gap;
    }
  });
  return out;
}

/**
 * @param reserve px kept clear at the top for the search field and the lifted
 *                rows. The heap sits below it.
 * @param fill    the stage has a fixed height (side by side with the page):
 *                the heap packs into what is left. Otherwise the stage grows
 *                to fit the heap, which on a phone is several rows deep.
 */
export function GlyphPile({ chips, lifted, rowTop, reserve, fill = false }: {
  chips: Chip[]; lifted: string[]; rowTop: number; reserve: number; fill?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const tiles = useRef(new Map<string, HTMLSpanElement>());
  const [width, setWidth] = useState(0);
  const [boxH, setBoxH] = useState(0);
  const [sizes, setSizes] = useState<Map<string, { w: number; h: number }> | null>(null);
  /* start: tiles wait above the stage. landing: they fall, staggered.
     settled: moves are lifts and drops, with no stagger left over. */
  const [phase, setPhase] = useState<'start' | 'landing' | 'settled'>('start');

  /* Narrow screens get fewer loose glyphs; every chip stays, because any of
     them may need to lift. */
  const shown = useMemo(() => {
    const glyphBudget = Math.round(Math.min(30, Math.max(8, width / 36)));
    let g = 0;
    return chips.filter((c) => c.kind !== 'glyph' || g++ < glyphBudget);
  }, [chips, width]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.clientWidth);
      setBoxH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Tile sizes come from the DOM, after the typeface has loaded. */
  useEffect(() => {
    if (!width) return;
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      const m = new Map<string, { w: number; h: number }>();
      for (const [id, el] of tiles.current) m.set(id, { w: el.offsetWidth, h: el.offsetHeight });
      setSizes(m);
    });
    return () => {
      live = false;
    };
  }, [width, shown]);

  const { pilePos, height } = useMemo(() => {
    if (!sizes || !width || (fill && !boxH)) return { pilePos: null, height: fill ? undefined : reserve + 200 };
    const list = shown.map((c) => sizes.get(c.id) ?? { w: 20, h: 20 });
    /* In a fixed stage the heap has to fit the room left under the field.
       Random drops leave hollows, so aim low, then squash if still too deep. */
    const room = fill ? Math.max(80, boxH - reserve - 12) : undefined;
    const pos = heap(list, width, room && room * 0.7);
    const depth = Math.max(...pos.map((p) => -p.y));
    const squash = room && depth > room ? room / depth : 1;
    const height = fill ? boxH : Math.round(reserve + depth + 8);
    const floor = height - 6;
    return {
      pilePos: new Map(shown.map((c, i) => [c.id, { ...pos[i], y: floor + pos[i].y * squash }])),
      height: fill ? undefined : height,
    };
  }, [sizes, width, boxH, fill, shown, reserve]);

  const liftPos = useMemo(
    () => (sizes && width ? rows(lifted, sizes, width, rowTop) : new Map<string, Pos>()),
    [lifted, sizes, width, rowTop],
  );

  /* One frame at the drop-in start position, then the transition carries
     everything down into the heap. */
  useEffect(() => {
    if (!pilePos || phase !== 'start') return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('landing')));
    return () => cancelAnimationFrame(id);
  }, [pilePos, phase]);

  useEffect(() => {
    if (phase !== 'landing') return;
    const t = setTimeout(() => setPhase('settled'), 1700);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className={`glyph-pile${fill ? ' is-fill' : ''}`} ref={box} style={{ height }} aria-hidden="true">
      {shown.map((c, i) => {
        const up = liftPos.get(c.id);
        const p = up ?? pilePos?.get(c.id);
        const style = p
          ? {
              transform: phase === 'start' && !up
                ? `translate(${p.x}px, ${p.y - (height ?? boxH) - 80}px) rotate(${p.r * 2}deg)`
                : `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)${up ? ' scale(1.06)' : ''}`,
              transitionDelay: phase === 'settled' ? `${up ? lifted.indexOf(c.id) * 28 : 0}ms` : `${(i * 37) % 700}ms`,
            }
          : { visibility: 'hidden' as const };
        return (
          <span
            key={c.id}
            ref={(el) => {
              if (el) tiles.current.set(c.id, el);
              else tiles.current.delete(c.id);
            }}
            className={`glyph glyph-${c.kind}${up ? ' is-lifted' : ''}`}
            style={style}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
