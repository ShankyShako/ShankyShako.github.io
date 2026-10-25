import { memo, useEffect, useRef, useState } from 'react';
import type { Plan, TextCmd } from '../../lib/resume/layout';
import { wordDiff } from '../../lib/resume/diff';

/**
 * The layout plan drawn as SVG, in points, so it is the PDF's page exactly:
 * same strings, same positions, same fonts. Lines slide when the page
 * re-flows, and a line whose words change resolves out of a scramble of type.
 */

const FAMILY: Record<TextCmd['font'], { family: string; weight?: number; style?: string }> = {
  regular: { family: 'GM LM Roman' },
  bold: { family: 'GM LM Roman', weight: 700 },
  italic: { family: 'GM LM Roman', style: 'italic' },
  caps: { family: 'GM LM Caps' },
};

const NOISE = 'abcdefghijklmnopqrstuvwxyz0123456789%&#/+{}λΣ∂';
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Resolves left to right from noise to `str`. Writes the DOM directly: no re-render per frame. */
const Scramble = memo(function Scramble({ str }: { str: string }) {
  const ref = useRef<SVGTSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Header, headings and dates are the same on every version of the page,
       so only bullets animate; this component is only used for those. */
    if (reduced()) { el.textContent = str; return; }
    const start = performance.now();
    const dur = first.current ? 520 : 420;
    first.current = false;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const done = Math.floor(str.length * t);
      let out = str.slice(0, done);
      for (let i = done; i < str.length; i++) {
        out += str[i] === ' ' ? ' ' : NOISE[(Math.random() * NOISE.length) | 0];
      }
      el.textContent = out;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [str]);
  return <tspan ref={ref}>{str}</tspan>;
});

export type Mark = 'reworded' | 'kept';
type Span = { id: string; x: number; top: number; bottom: number };

/** Where each bullet sits on the page: its marker's x, first line's top, last line's baseline. */
function bulletSpans(plan: Plan, marks: Record<string, Mark>): Span[] {
  const spans = new Map<string, Span>();
  plan.commands.forEach((c, i) => {
    if (c.kind !== 'text' || !c.bulletOf || !marks[c.bulletOf]) return;
    const s = spans.get(c.bulletOf);
    if (s) {
      s.bottom = c.y;
      return;
    }
    const prev = plan.commands[i - 1];
    const markerX = prev && prev.kind === 'text' && prev.str === '•' ? prev.x : c.x - 12;
    spans.set(c.bulletOf, { id: c.bulletOf, x: markerX - 6, top: c.y - c.size * 0.75, bottom: c.y });
  });
  return [...spans.values()];
}

type Tip = { id: string; left: number; top: number };

/** The marked bullet under a point in plan coordinates, if any. */
function spanAt(spans: Span[], x: number, y: number, pageW: number) {
  return spans.find((s) => y >= s.top - 1 && y <= s.bottom + 3 && x >= s.x - 4 && x <= pageW - (s.x - 4));
}

export function ResumePaper({
  plan,
  label,
  marks,
  originals,
  whys,
  changes,
}: {
  plan: Plan;
  label: string;
  /** Margin bars drawn in the SVG only; the PDF is drawn from the plan and never sees them. */
  marks?: Record<string, Mark>;
  originals?: Record<string, string>;
  /** Why a rewrite was kept out, per bullet id, for the 'kept' tooltip. */
  whys?: Record<string, string>;
  /** Per reworded bullet: the new wording and the facts verify.ts kept. */
  changes?: Record<string, { after: string; facts: string[] }>;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const lastType = useRef('mouse');
  const spans = marks ? bulletSpans(plan, marks) : [];

  /* A tap elsewhere closes a tooltip opened by touch. */
  useEffect(() => {
    if (!tip) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.resume-paper')) setTip(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);

  /* Marked bullets are found from the pointer's position rather than by an
     overlay, so links and text inside them still take the pointer. */
  const hit = (e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm || !spans.length) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const s = spanAt(spans, p.x, p.y - plan.top, plan.pageW);
    return s ? { s, svg, ctm } : null;
  };
  const place = ({ s, svg, ctm }: NonNullable<ReturnType<typeof hit>>) => {
    if (tip?.id === s.id) return;
    const f = svg.parentElement!.getBoundingClientRect();
    const at = new DOMPoint(s.x - 4, s.bottom + plan.top + 3).matrixTransform(ctm);
    /* 380: the tooltip's widest (46ch at 14px plus padding); CSS caps it to the frame on phones. */
    const left = Math.max(8, Math.min(at.x - f.left + 16, f.width - 380));
    setTip({ id: s.id, left, top: at.y - f.top + 6 });
  };
  const lineNo = new Map<string, number>();
  const seen = new Map<string, number>();
  let rules = 0;
  const qr = plan.commands.find((c) => c.kind === 'badge');

  return (
    <>
    <svg
      className="resume-paper"
      viewBox={`0 0 ${plan.pageW} ${plan.pageH}`}
      role="document"
      aria-label={label}
      data-hover={tip ? '' : undefined}
      onPointerDown={(e) => { lastType.current = e.pointerType; }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const h = hit(e);
        if (h) place(h);
        else if (tip) setTip(null);
      }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') setTip(null); }}
      onClick={(e) => {
        if (lastType.current !== 'touch') return;
        const h = hit(e);
        if (!h || tip?.id === h.s.id) setTip(null);
        else place(h);
      }}
    >
      <rect width={plan.pageW} height={plan.pageH} fill="#fff" />
      <g transform={`translate(0 ${plan.top})`}>
        {plan.commands.map((c) => {
          if (c.kind === 'rule') {
            const key = `rule:${rules++}`;
            return (
              <line key={key} className="paper-move" x1={c.x1} x2={c.x2} y1={0} y2={0}
                style={{ transform: `translateY(${c.y}px)` }} stroke="#000" strokeWidth={c.thickness} />
            );
          }
          if (c.kind === 'badge') return null;

          /* Stable keys: a bullet's k-th line keeps its element when the page
             re-flows around it, so it slides instead of popping. */
          let key: string;
          if (c.bulletOf) {
            const k = lineNo.get(c.bulletOf) ?? 0;
            lineNo.set(c.bulletOf, k + 1);
            key = `b:${c.bulletOf}:${k}`;
          } else {
            const n = seen.get(c.str) ?? 0;
            seen.set(c.str, n + 1);
            key = `t:${c.str}:${n}`;
          }
          const f = FAMILY[c.font];
          const text = (
            <text
              key={key}
              className="paper-move"
              x={0}
              y={0}
              /* A marker's y is the text baseline it shares for parsers;
                 the PDF lifts it with text rise, and so does this. */
              style={{ transform: `translate(${c.x}px, ${c.y - (c.rise ?? 0)}px)` }}
              fontFamily={`"${f.family}"`}
              fontWeight={f.weight}
              fontStyle={f.style}
              fontSize={c.size}
            >
              {c.bulletOf ? <Scramble str={c.str} /> : c.str}
            </text>
          );
          return c.href ? (
            <a key={key} href={c.href} target="_blank" rel="noopener noreferrer">{text}</a>
          ) : (
            text
          );
        })}
        {spans.map((s) => {
          const len = s.bottom - s.top;
          /* A solid bar is a unit rect scaled to the bullet, keyed by bullet,
             so when a rewrite changes the line count it stretches with the
             same transition the lines slide on. Dots would stretch, so a
             dotted bar is redrawn at its length instead (a kept bullet keeps
             its original wording, so its length rarely changes). */
          return marks![s.id] === 'reworded' ? (
            <rect
              key={`mark:${s.id}`}
              className="paper-move paper-mark is-reworded"
              x={s.x - 0.75} y={0} width={1.5} height={1}
              style={{ transform: `translateY(${s.top}px) scaleY(${len})` }}
            />
          ) : (
            <line
              key={`mark:${s.id}:${Math.round(len)}`}
              className="paper-move paper-mark is-kept"
              x1={s.x} x2={s.x} y1={0} y2={len}
              style={{ transform: `translateY(${s.top}px)` }}
              strokeWidth={1.5}
              strokeDasharray="1.5 2.5"
            />
          );
        })}
        {qr && qr.kind === 'badge' && (
          <a href={qr.href} target="_blank" rel="noopener noreferrer" aria-label={`QR code: ${qr.href.replace(/^https?:\/\//, '')}`}>
            <path d={qr.qr.path} transform={`translate(${qr.x} ${qr.y}) scale(${qr.w / qr.qr.size})`} fill="#000" shapeRendering="crispEdges" />
          </a>
        )}
      </g>
    </svg>
    {tip && marks?.[tip.id] && (
      <div className="paper-tip" role="tooltip" style={{ left: tip.left, top: tip.top }}>
        {marks[tip.id] === 'reworded' ? (
          changes?.[tip.id] && originals?.[tip.id] ? (
            <>
              <span className="tip-label">Changed from the original</span>
              <span className="tip-diff">
                {wordDiff(originals[tip.id], changes[tip.id].after).map((d, i) => {
                  const sp = i ? ' ' : '';
                  return d.kind === 'del' ? <span key={i}>{sp}<del>{d.text}</del></span>
                    : d.kind === 'ins' ? <span key={i}>{sp}<ins>{d.text}</ins></span>
                    : <span key={i}>{sp}{d.text}</span>;
                })}
              </span>
              <span className="tip-facts">
                Checked: {changes[tip.id].facts.length ? <>{changes[tip.id].facts.map((x, i) => <span key={x}>{i ? ', ' : ''}<b>{x}</b></span>)} all still here · </> : null}no new tools · no bigger claims
              </span>
            </>
          ) : (
            <>
              <strong>Originally:</strong> {originals?.[tip.id]}
            </>
          )
        ) : (
          <>Kept as written: the rewrite {whys?.[tip.id] ?? 'changed a fact'}.</>
        )}
      </div>
    )}
    </>
  );
}

