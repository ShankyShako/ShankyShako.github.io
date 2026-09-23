import { memo, useEffect, useRef } from 'react';
import type { Plan, TextCmd } from '../../lib/resume/layout';

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

export function ResumePaper({ plan, label }: { plan: Plan; label: string }) {
  const lineNo = new Map<string, number>();
  const seen = new Map<string, number>();
  let rules = 0;
  const qr = plan.commands.find((c) => c.kind === 'badge');

  return (
    <svg
      className="resume-paper"
      viewBox={`0 0 ${plan.pageW} ${plan.pageH}`}
      role="document"
      aria-label={label}
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
        {qr && qr.kind === 'badge' && (
          <a href={qr.href} target="_blank" rel="noopener noreferrer" aria-label="QR code: gmango.dev">
            <path d={qr.qr.path} transform={`translate(${qr.x} ${qr.y}) scale(${qr.w / qr.qr.size})`} fill="#000" shapeRendering="crispEdges" />
          </a>
        )}
      </g>
    </svg>
  );
}

