import { useEffect, useMemo, useRef, useState } from 'react';

import { fragments } from '../../data/resume';
import { CHIPS, fragById, liftedChips, parseQuery, rank, tailorSkillLines } from '../../lib/resume/match';
import { normalizeRewrite, verifyRewrite } from '../../lib/resume/verify';
import { tailorStream } from '../../lib/resume/tailor';
import type { Typesetter } from '../../lib/resume/layout';
import type { fit as fitFn } from '../../lib/resume/fit';
import { useBotStatus } from '../../hooks/useBotStatus';
import { GlyphPile } from './GlyphPile';
import { ResumePaper } from './ResumePaper';

/**
 * Resume personalizer. Type a role or paste a posting:
 *
 *  1. every keystroke: plain JS ranks the bullets and lifts the matching
 *     chips out of the pile (match.ts). Works with no network at all.
 *  2. a beat later: the typesetter fills exactly one page in that order
 *     (fit.ts, layout.ts) and the preview re-sets itself.
 *  3. after a pause, if the chat bot is up: a free model rewords the chosen
 *     bullets (bot /tailor). verify.ts rejects any rewrite that changes a
 *     fact, and the original bullet stays.
 *
 * The PDF export draws the same layout plan the preview shows.
 */

type Engine = { ts: Typesetter; fit: typeof fitFn };
type Rewrite = { text: string; ok: boolean; why: string[] };

let engineLoad: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  engineLoad ??= Promise.all([import('../../lib/resume/layout'), import('../../lib/resume/fit')])
    .then(async ([layout, fit]) => ({ ts: await layout.Typesetter.load(), fit: fit.fit }))
    .catch((err) => {
      engineLoad = null; // let the next focus try again
      throw err;
    });
  return engineLoad;
}

const EXAMPLES = ['ML engineer at a health startup', 'computer vision research', 'LLM apps, full-stack', 'reinforcement learning'];
/* The lifted row sits under the field, which grows when a posting is pasted. */
const FIELD_TOP = 30;
const RESERVE = 290;
const ORIGINAL = Object.fromEntries(fragments.map((f) => [f.id, f.text]));

export function Personalizer({ original }: { original: string }) {
  const [query, setQuery] = useState('');
  const [settled, setSettled] = useState('');
  const [engine, setEngine] = useState<Engine | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [rewrites, setRewrites] = useState<{ query: string; byId: Record<string, Rewrite> }>({ query: '', byId: {} });
  const [phase, setPhase] = useState<'idle' | 'rewriting' | 'done' | 'failed'>('idle');
  const [saving, setSaving] = useState(false);
  const rush = useRef('');
  const [nudge, setNudge] = useState(0);
  /* Finished rewrites per query, so going back to a role does not ask again. */
  const cache = useRef(new Map<string, Record<string, Rewrite>>());
  const field = useRef<HTMLTextAreaElement>(null);
  const [fieldH, setFieldH] = useState(58);
  const { status, botUrl } = useBotStatus();

  const warm = () => {
    if (engine) return;
    loadEngine().then((e) => {
      setEngineFailed(false);
      setEngine(e);
    }, () => setEngineFailed(true));
  };

  /* 1. Chips follow every keystroke. */
  const live = useMemo(() => rank(parseQuery(query)), [query]);
  const lifted = useMemo(() => (query.trim().length >= 2 ? liftedChips(query, live) : []), [query, live]);

  /* 2. The page follows once typing pauses for a moment. */
  useEffect(() => {
    const t = setTimeout(() => setSettled(query.trim()), 180);
    return () => clearTimeout(t);
  }, [query]);

  const active = settled.length >= 2;
  const ranking = useMemo(() => rank(parseQuery(settled)), [settled]);
  const skills = useMemo(() => tailorSkillLines(settled), [settled]);
  const texts = useMemo(() => {
    if (rewrites.query !== settled) return ORIGINAL;
    const t = { ...ORIGINAL };
    for (const [id, r] of Object.entries(rewrites.byId)) if (r.ok) t[id] = r.text;
    return t;
  }, [rewrites, settled]);
  const fitted = useMemo(
    () => (engine && active ? engine.fit(engine.ts, ranking, texts, skills) : null),
    [engine, active, ranking, texts, skills],
  );
  const fittedRef = useRef(fitted);
  fittedRef.current = fitted;

  /* 3. Rewording, once per settled query. Typing again aborts it. */
  const canRewrite = status === 'online' && !!engine && settled.length >= 4;
  useEffect(() => {
    setPhase('idle');
    if (!canRewrite) return;
    const hit = cache.current.get(settled);
    if (hit) {
      setRewrites({ query: settled, byId: hit });
      setPhase('done');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const ids = (fittedRef.current?.ids ?? []).filter((id) => !fragById.get(id)!.fixed);
      if (!ids.length) return;
      setRewrites({ query: settled, byId: {} });
      setPhase('rewriting');
      try {
        for await (const r of tailorStream(botUrl, settled, ids, ctrl.signal)) {
          const f = fragById.get(r.id);
          if (!f) continue;
          const text = normalizeRewrite(r.text);
          const v = verifyRewrite(f, text, settled);
          setRewrites((prev) =>
            prev.query === settled
              ? { query: settled, byId: { ...prev.byId, [r.id]: { text, ok: v.ok && text !== f.text, why: v.why } } }
              : prev,
          );
        }
        setRewrites((prev) => {
          if (prev.query === settled) cache.current.set(settled, prev.byId);
          return prev;
        });
        setPhase('done');
      } catch {
        if (!ctrl.signal.aborted) setPhase('failed');
      }
    }, rush.current === settled ? 0 : 1100);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [settled, canRewrite, botUrl, nudge]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const q = query.trim();
      rush.current = q;
      /* Already settled: the timer is running, so restart it at zero. */
      if (q === settled && (rewrites.query !== q || phase === 'failed')) setNudge((n) => n + 1);
      setSettled(q);
    }
    if (e.key === 'Escape') setQuery('');
  };

  /* A pasted posting is long; let the field grow a little, then scroll. */
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    setFieldH(el.offsetHeight);
  }, [query]);

  const download = async () => {
    if (!engine || !fitted) return;
    setSaving(true);
    try {
      const bytes = await engine.ts.pdf(fitted.page);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const slug = settled.toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 4).join('-');
      const a = Object.assign(document.createElement('a'), { href: url, download: `Genova-Mongalo-Resume-${slug || 'tailored'}.pdf` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setSaving(false);
    }
  };

  const tailorable = fitted?.ids.filter((id) => !fragById.get(id)!.fixed).length ?? 0;
  const done = rewrites.query === settled ? Object.values(rewrites.byId) : [];
  const kept = done.filter((r) => !r.ok && r.why.length);
  const note = !active
    ? ''
    : engineFailed
      ? 'The typesetter did not load. Reload to try again.'
      : !fitted
        ? 'Setting type…'
        : phase === 'rewriting'
          ? 'Rewording for this role…'
          : phase === 'done' && !done.some((r) => r.ok) && !kept.length
            ? 'The model kept every bullet as written for this role.'
          : phase === 'done'
            ? `Reworded ${done.filter((r) => r.ok).length} bullets for this role.${kept.length ? ` Kept ${kept.length} as written, because a rewrite changed a fact.` : ''}`
            : phase === 'failed'
              ? done.some((r) => r.ok)
                ? `Rewording stopped partway. ${done.filter((r) => r.ok).length} bullets are reworded, the rest as written.`
                : 'Rewording failed, so the bullets are as written. Picked and ordered for this role.'
              : !ranking.matched
                ? 'Nothing on the resume matches that, so this is the general version.'
              : status === 'online'
                ? 'Picked and ordered for this role. Rewording starts when you stop typing.'
                : 'Picked and ordered for this role, in your browser. Rewording needs the chat bot, which is offline.';

  return (
    <section className="tailor" aria-labelledby="tailor-title">
      <div className="tailor-stage" onPointerEnter={warm}>
        <h2 id="tailor-title" className="visually-hidden">Tailor this resume</h2>
        <div className="tailor-field">
          <textarea
            ref={field}
            rows={1}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={warm}
            onKeyDown={onKey}
            placeholder="Tailor it to a role or job post"
            aria-label="Role or job description to tailor the resume to"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className="tailor-clear"
              onClick={() => {
                setQuery('');
                field.current?.focus();
              }}
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>
        {!query && (
          <div className="tailor-examples" style={{ top: FIELD_TOP + fieldH + 14 }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => { warm(); setQuery(ex); }}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <GlyphPile chips={CHIPS} lifted={lifted} rowTop={FIELD_TOP + fieldH + 22} reserve={RESERVE} />
      </div>

      <div className="tailor-bar" aria-live="polite">
        <p>
          {note}
          {/* Progress is shown, not announced: one update per bullet is noise. */}
          {phase === 'rewriting' && <span aria-hidden="true"> {done.length} of {tailorable}</span>}
        </p>
        {active && fitted && (
          <button type="button" className="btn btn-solid" onClick={download} disabled={saving || phase === 'rewriting'}>
            {saving ? 'Saving…' : 'Download this version'}
          </button>
        )}
      </div>
      {phase === 'done' && kept.length > 0 && (
        <details className="tailor-kept">
          <summary>What was kept, and why</summary>
          <ul>
            {Object.entries(rewrites.byId)
              .filter(([, r]) => !r.ok && r.why.length)
              .map(([id, r]) => (
                <li key={id}>
                  <q>{fragById.get(id)!.text.slice(0, 70)}…</q> the rewrite {r.why.join(', ')}.
                </li>
              ))}
          </ul>
        </details>
      )}

      <div className="resume-frame">
        {active && fitted ? (
          <ResumePaper plan={fitted.plan} label={`Resume tailored to: ${settled.slice(0, 80)}`} />
        ) : (
          <iframe src={original} title="Resume of Genova Mongalo" />
        )}
      </div>
    </section>
  );
}
