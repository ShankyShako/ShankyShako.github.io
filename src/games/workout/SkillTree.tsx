/* The skill tree: equipment and technique on one hex map, the lifter in the
   middle. Owned hexes are lit, available ones are outlined with their cost
   (and glow when affordable), the next step out is a "?" fog hex, and the
   rest stays hidden. Hover or focus shows a node's numbers in the stat card;
   on touch the first tap only selects, and the card's Buy button buys.
   The rules live in engine.ts (TREE, nodeState, buyNode, nodeInfo). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { NodeId, NodeState, State } from './engine';
import { canBuy, fmt, nodeInfo, nodeState, TREE, treeNode } from './engine';

const SQ3 = Math.sqrt(3);
/* Flat-top hexes, axial coordinates, in units of the hex's circumradius. */
const at = (q: number, r: number) => ({ x: 1.5 * q, y: SQ3 * (r + q / 2) });
/* The map is the radius-2 honeycomb around the lifter, less the two
   empty tips straight above and below it, so the hexes can be bigger. */
const RADIUS = 2;
const W_U = 3 * RADIUS + 2;
const H_U = SQ3 * 2 * RADIUS;
const X0 = -(W_U / 2);
const Y0 = -(H_U / 2);
/** Drawn hex size against its grid cell: the gap shows the connectors. */
const K = 0.88;
const S_MIN = 30;
const S_MAX = 64;

const CELLS: { q: number; r: number }[] = [];
for (let q = -RADIUS; q <= RADIUS; q++)
  for (let r = Math.max(-RADIUS, -q - RADIUS); r <= Math.min(RADIUS, -q + RADIUS); r++)
    if (!TREE.some((n) => n.q === q && n.r === r) && Math.abs(at(q, r).y) < H_U / 2 - 0.8) CELLS.push({ q, r });

const hexPoints = (cx: number, cy: number, R: number) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const a = (Math.PI / 3) * i;
      return `${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`;
    })
    .join(' ');

const SHORT: Record<NodeId, string> = {
  lifter: 'Lifter',
  chalk: 'Chalk',
  wraps: 'Wraps',
  belt: 'Belt',
  sleeves: 'Sleeves',
  shirt: 'Shirt',
  gold: 'Gold',
  plates: 'Plates',
  window: 'Timing',
  power: 'Explosive',
  mirror: 'Mirroring',
  cap: 'Endurance',
};

/* Simple flat glyphs, 24×24, stroked in the node's colour. */
const GLYPH: Record<NodeId, ReactNode> = {
  lifter: null,
  chalk: (
    <>
      <path d="M5 10h14v8H5z" />
      <path d="M8 10V7m4 3V5m4 5V7" />
    </>
  ),
  wraps: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="3" />
      <path d="M6 10l12-3M6 16l12-3" />
    </>
  ),
  belt: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="2" />
      <rect x="9" y="9.5" width="6" height="5" rx="1" />
    </>
  ),
  sleeves: (
    <>
      <path d="M8 4h8l-1 16H9z" />
      <path d="M8.4 10h7.2M8.8 15h6.4" />
    </>
  ),
  shirt: <path d="M9 4 4 7l2 4 2-1v10h8V10l2 1 2-4-5-3c-.5 1.4-1.6 2.2-3 2.2S9.5 5.4 9 4z" />,
  gold: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  plates: (
    <>
      <circle cx="10" cy="12" r="7" />
      <circle cx="10" cy="12" r="2" />
      <path d="M19.5 8v6M16.5 11h6" />
    </>
  ),
  window: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V10M10 3h4M12 3v3.5" />
    </>
  ),
  cap: <path d="M2.5 12.5h4.5l2-5 4 10 2-5h6.5" />,
  power: <path d="M13.5 2.5 5 14h6.5l-1 7.5L19 10h-6.5z" />,
  mirror: (
    <>
      <rect x="5.5" y="8" width="13" height="11" rx="2.5" />
      <path d="M12 8V4.5M9.5 13h.01M14.5 13h.01" />
    </>
  ),
};

const KIND_LABEL = { root: 'You', gear: 'Gear', tech: 'Technique', repeat: 'Gear · repeatable' } as const;
const STATE_LABEL: Record<NodeState, string> = { owned: 'owned', available: 'available', locked: 'locked', hidden: 'hidden' };
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = {
  s: State;
  lifter: string;
  onBuy: (id: NodeId) => void;
  onClose: () => void;
};

export function SkillTree({ s, lifter, onBuy, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<NodeId | null>(null);
  /** The last hex focused, clicked or tapped; hover shows over it. */
  const [pick, setPick] = useState<NodeId | null>(null);
  const lastPtr = useRef('mouse');
  const els = useRef(new Map<NodeId, HTMLButtonElement>());

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const states = Object.fromEntries(TREE.map((n) => [n.id, nodeState(s, n.id)])) as Record<NodeId, NodeState>;
  const visible = TREE.filter((n) => states[n.id] !== 'hidden');

  /* Reveal: hexes that just came out of hiding fade and scale in, one after
     another; a node just bought gives a small pop. */
  const prev = useRef(states);
  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = states;
    const calm = reduced();
    let k = 0;
    for (const n of TREE) {
      const el = els.current.get(n.id);
      if (!el || was[n.id] === states[n.id]) continue;
      if (was[n.id] === 'hidden') {
        el.animate(calm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(0.55)' }, { opacity: 1, transform: 'none' }], {
          duration: 360,
          delay: 120 + 90 * k++,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'backwards',
        });
      } else if (states[n.id] === 'owned' && !calm) {
        el.animate([{ transform: 'scale(1.12)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      } else if (states[n.id] === 'available') {
        el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, delay: 120 + 90 * k++, fill: 'backwards' });
      }
    }
  });

  /* Open on the cheapest thing you can buy, else the cheapest available. */
  const ranked = visible.filter((n) => states[n.id] === 'available').sort((a, b) => nodeInfo(s, a.id).cost - nodeInfo(s, b.id).cost);
  const fallback = (ranked.find((n) => canBuy(s, n.id)) ?? ranked[0])?.id ?? 'lifter';
  const shown = [hover, pick].find((id): id is NodeId => id !== null && states[id] !== 'hidden') ?? fallback;
  const info = nodeInfo(s, shown);

  /* Move focus into the map when it opens. */
  useEffect(() => {
    els.current.get(fallback)?.focus({ preventScroll: true });
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const S = Math.max(S_MIN, Math.min(S_MAX, size.w / W_U, size.h / H_U));
  const px = (q: number, r: number) => {
    const p = at(q, r);
    return { x: (p.x - X0) * S, y: (p.y - Y0) * S };
  };
  const mapW = W_U * S;
  const mapH = H_U * S;

  const activate = (id: NodeId) => {
    const touch = lastPtr.current === 'touch' || lastPtr.current === 'pen';
    setPick(id);
    if (!touch && canBuy(s, id)) onBuy(id);
  };

  const onArrow = (e: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dirs[e.key];
    const from = (e.target as HTMLElement).dataset.node as NodeId | undefined;
    if (!d || !from) return;
    e.preventDefault();
    const a = treeNode(from);
    const pa = at(a.q, a.r);
    let best: { id: NodeId; score: number } | null = null;
    for (const n of visible) {
      if (n.id === from) continue;
      const p = at(n.q, n.r);
      const vx = p.x - pa.x;
      const vy = p.y - pa.y;
      const len = Math.hypot(vx, vy);
      const cos = (vx * d[0] + vy * d[1]) / len;
      if (cos < 0.4) continue;
      const score = len * (2 - cos);
      if (!best || score < best.score) best = { id: n.id, score };
    }
    if (best) els.current.get(best.id)?.focus();
  };

  const ready = TREE.filter((n) => canBuy(s, n.id)).length;

  return (
    <section className="wk-tree" id="wk-tree" aria-label="Skill tree">
      <header className="wk-flyout-head wk-tree-head">
        <div>
          <h2>Skill Tree</h2>
          <p className="wk-tree-sub">
            <span>
              <b className="wk-tree-gains">{fmt(s.gains)}</b> Gains
            </span>
            <span className="wk-key is-gear">Gear</span>
            <span className="wk-key is-tech">Technique</span>
            <span>{ready > 0 ? `${ready} ready` : 'Earn Gains to buy the next'}</span>
          </p>
        </div>
        <button type="button" className="wk-close" aria-label="Close the skill tree" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="wk-tree-body">
        <div className="wk-tree-box" ref={box}>
          <div className="wk-tree-map" style={{ width: mapW, height: mapH }} onKeyDown={onArrow} onPointerLeave={() => setHover(null)}>
            <svg className="wk-tree-grid" width={mapW} height={mapH} aria-hidden="true" focusable="false">
              {CELLS.map((c) => {
                const p = px(c.q, c.r);
                return <polygon key={`${c.q},${c.r}`} className="wk-cell" points={hexPoints(p.x, p.y, S * K)} />;
              })}
              {visible.flatMap((n) =>
                n.requires
                  .filter((r) => states[r] !== 'hidden')
                  .map((r) => {
                    const a = px(treeNode(r).q, treeNode(r).r);
                    const b = px(n.q, n.r);
                    const st = states[n.id];
                    const cls = states[r] === 'owned' && st === 'owned' ? 'is-lit' : states[r] === 'owned' && st === 'available' ? 'is-open' : 'is-fog';
                    return <line key={`${r}-${n.id}`} className={`wk-link ${cls} is-${n.kind}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
                  }),
              )}
            </svg>

            {visible.map((n) => {
              const st = states[n.id];
              const p = px(n.q, n.r);
              const w = 2 * S * K;
              const h = SQ3 * S * K;
              const ni = nodeInfo(s, n.id);
              const afford = canBuy(s, n.id);
              const fog = st === 'locked';
              const level = n.kind === 'repeat' && ni.name !== 'Plates' ? ni.name.replace('Plates ', '') : null;
              const label =
                n.kind === 'root'
                  ? `Lifter: rep base and multipliers`
                  : `${ni.name}, ${KIND_LABEL[n.kind].toLowerCase()}, ${STATE_LABEL[st]}${st === 'available' ? `, ${fmt(ni.cost)} Gains${afford ? ', can buy' : ''}` : ''}${fog && ni.need ? `. ${ni.need}` : ''}`;
              return (
                <button
                  key={n.id}
                  ref={(el) => {
                    if (el) els.current.set(n.id, el);
                    else els.current.delete(n.id);
                  }}
                  type="button"
                  data-node={n.id}
                  className={`wk-hex is-${n.kind} is-${st}${afford ? ' is-afford' : ''}${shown === n.id ? ' is-shown' : ''}`}
                  style={{ left: p.x - w / 2, top: p.y - h / 2, width: w, height: h, ['--hs' as string]: `${S}px` }}
                  aria-label={label}
                  aria-describedby={shown === n.id ? 'wk-tree-card' : undefined}
                  onPointerDown={(e) => {
                    lastPtr.current = e.pointerType;
                    if (e.pointerType !== 'mouse') setHover(null);
                  }}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(n.id)}
                  onFocus={() => setPick(n.id)}
                  onClick={(e) => {
                    /* A keyboard click has no pointer: treat it as a mouse. */
                    if (e.detail === 0) lastPtr.current = 'keyboard';
                    activate(n.id);
                  }}
                >
                  <svg className="wk-hex-shape" viewBox="-1 -0.866 2 1.732" aria-hidden="true" focusable="false">
                    <polygon points={hexPoints(0, 0, 0.97)} />
                    <polygon className="wk-hex-ring" points={hexPoints(0, 0, 0.85)} />
                  </svg>
                  {n.kind === 'root' ? (
                    <img className="wk-hex-lifter" src={lifter} alt="" draggable={false} />
                  ) : fog ? (
                    <span className="wk-hex-q" aria-hidden="true">
                      ?
                    </span>
                  ) : (
                    <span className="wk-hex-in" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {GLYPH[n.id]}
                      </svg>
                      <span className="wk-hex-name">{SHORT[n.id]}{level ? ` ${level}` : ''}</span>
                      {st === 'available' && <span className="wk-hex-cost">{fmt(ni.cost)}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`wk-tree-card is-${info.kind} is-${info.state}`} id="wk-tree-card">
          <p className="wk-tree-kind">
            {KIND_LABEL[info.kind]}
            {info.state === 'owned' && info.kind !== 'root' ? ' · owned' : ''}
            {info.state === 'locked' ? ' · locked' : ''}
          </p>
          <h3 className="wk-tree-name">{info.name}</h3>
          <ul className="wk-tree-stats">
            {info.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {info.need && <p className="wk-tree-need">{info.need}</p>}
          {info.state === 'available' && (
            <div className="wk-tree-buy">
              <span className="wk-tree-cost">
                {fmt(info.cost)} <small>Gains</small>
              </span>
              <button
                type="button"
                className={`btn btn-solid wk-buy${canBuy(s, info.id) ? '' : ' is-short'}`}
                aria-disabled={!canBuy(s, info.id)}
                onClick={() => canBuy(s, info.id) && onBuy(info.id)}
              >
                {canBuy(s, info.id) ? `Buy ${info.name}` : `${fmt(info.cost - s.gains)} more`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
