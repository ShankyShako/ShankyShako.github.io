import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { fragments } from '../../data/resume';
import { CHIPS, DEFAULT_RANKING, fragById, liftedChips, parseQuery, rank, tailorSkillLines } from '../../lib/resume/match';
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

/* Side by side needs room for a readable stage next to a full-height page. */
const SIDE_QUERY = '(min-width: 1000px)';
const PAGE_RATIO = 8.5 / 11;

/**
 * Stage and page side by side, sized so both fit the window without
 * scrolling: the row runs from where it starts to the bottom of the viewport.
 * Measured from the document top (offsetTop, not the bounding box), because
 * the Reveal wrapper animates a transform on mount.
 */
function useSideBySide(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const mq = window.matchMedia(SIDE_QUERY);
    const measure = () => {
      const el = ref.current;
      if (!el || !mq.matches) return setHeight(null);
      let top = 0;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
      setHeight(Math.max(540, window.innerHeight - top - 20));
    };
    measure();
    window.addEventListener('resize', measure);
    mq.addEventListener('change', measure);
    return () => {
      window.removeEventListener('resize', measure);
      mq.removeEventListener('change', measure);
    };
  }, [ref]);
  return height;
}

export function Personalizer() {
  const [query, setQuery] = useState('');
  const [settled, setSettled] = useState('');
  const [engine, setEngine] = useState<Engine | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [rewrites, setRewrites] = useState<{ query: string; byId: Record<string, Rewrite> }>({ query: '', byId: {} });
  const [phase, setPhase] = useState<'idle' | 'rewriting' | 'done' | 'failed'>('idle');
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const rush = useRef('');
  const [nudge, setNudge] = useState(0);
  /* Finished rewrites per query, so going back to a role does not ask again. */
  const cache = useRef(new Map<string, Record<string, Rewrite>>());
  const field = useRef<HTMLTextAreaElement>(null);
  const [fieldH, setFieldH] = useState(58);
  const { status, botUrl } = useBotStatus();
  const section = useRef<HTMLElement>(null);
  const sideH = useSideBySide(section);

  const warm = () => {
    if (engine) return;
    loadEngine().then((e) => {
      setEngineFailed(false);
      setEngine(e);
    }, () => setEngineFailed(true));
  };

  /* The page itself is the default resume, so the typesetter loads at once. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(warm, []);

  /* 1. Chips follow every keystroke. */
  const live = useMemo(() => rank(parseQuery(query)), [query]);
  const lifted = useMemo(() => (query.trim().length >= 2 ? liftedChips(query, live) : []), [query, live]);

  /* 2. The page follows once typing pauses for a moment. */
  useEffect(() => {
    const t = setTimeout(() => setSettled(query.trim()), 180);
    return () => clearTimeout(t);
  }, [query]);

  const active = settled.length >= 2;
  const ranking = useMemo(() => (settled.length >= 2 ? rank(parseQuery(settled)) : DEFAULT_RANKING), [settled]);
  const skills = useMemo(() => tailorSkillLines(settled), [settled]);
  const texts = useMemo(() => {
    if (rewrites.query !== settled) return ORIGINAL;
    const t = { ...ORIGINAL };
    for (const [id, r] of Object.entries(rewrites.byId)) if (r.ok) t[id] = r.text;
    return t;
  }, [rewrites, settled]);
  const fitted = useMemo(
    () => (engine ? engine.fit(engine.ts, ranking, texts, skills) : null),
    [engine, ranking, texts, skills],
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
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setFailure(err instanceof Error ? err.message.replace(/\.$/, '') : '');
        setPhase('failed');
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
      const bytes = await engine.ts.pdf(fitted.page, fitted.scale);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const slug = settled.toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 4).join('-');
      const name = active && slug ? `Genova-Mongalo-Resume-${slug}.pdf` : 'Genova-Mongalo-Resume.pdf';
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setSaving(false);
    }
  };

  /* /resume?download (the chat bot's "Download the resume" link) saves the
     default version as soon as it is typeset, once. */
  const autoSave = useRef(new URLSearchParams(window.location.search).has('download'));
  useEffect(() => {
    if (!autoSave.current || !fitted || active) return;
    autoSave.current = false;
    window.history.replaceState(null, '', window.location.pathname);
    download();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitted, active]);

  const tailorable = fitted?.ids.filter((id) => !fragById.get(id)!.fixed).length ?? 0;
  const done = rewrites.query === settled ? Object.values(rewrites.byId) : [];
  const kept = done.filter((r) => !r.ok && r.why.length);
  const note = engineFailed
    ? 'The resume did not load. Reload to try again.'
    : !active
      ? ''
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
                : `Rewording failed${failure ? ` (${failure})` : ''}, so the bullets are as written. Picked and ordered for this role.`
              : !ranking.matched
                ? 'Nothing on the resume matches that, so this is the general version.'
              : status === 'online'
                ? 'Picked and ordered for this role. Rewording starts when you stop typing.'
                : 'Picked and ordered for this role, in your browser. Rewording needs the chat bot, which is offline.';

  return (
    <section
      ref={section}
      className={`tailor${sideH ? ' is-side' : ''}`}
      aria-labelledby="tailor-title"
      style={sideH ? ({ height: sideH, '--page-w': `${Math.round(sideH * PAGE_RATIO)}px` } as React.CSSProperties) : undefined}
    >
      <div className="tailor-main">
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
        <GlyphPile chips={CHIPS} lifted={lifted} rowTop={FIELD_TOP + fieldH + 22} reserve={RESERVE} fill={!!sideH} />
      </div>

      <div className="tailor-bar" aria-live="polite">
        <p>
          {note}
          {/* Progress is shown, not announced: one update per bullet is noise. */}
          {phase === 'rewriting' && <span aria-hidden="true"> {done.length} of {tailorable}</span>}
        </p>
        {fitted && (
          <button type="button" className="btn btn-solid" onClick={download} disabled={saving || phase === 'rewriting'}>
            {saving ? 'Saving…' : active ? 'Download this version' : 'Download PDF'}
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
      </div>

      <div className="resume-frame">
        {fitted ? (
          <ResumePaper
            plan={fitted.plan}
            label={active ? `Resume tailored to: ${settled.slice(0, 80)}` : 'Resume of Genova Mongalo'}
          />
        ) : (
          <div className="resume-placeholder" aria-busy="true">
            {engineFailed ? 'The resume did not load.' : 'Setting type…'}
          </div>
        )}
      </div>
    </section>
  );
}
