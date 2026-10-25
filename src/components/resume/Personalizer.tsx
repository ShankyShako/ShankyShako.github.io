import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { fragments } from '../../data/resume';
import { CHIPS, DEFAULT_RANKING, fragById, liftedChips, parseQuery, rank, tailorSkillLines } from '../../lib/resume/match';
import { normalizeRewrite, technologiesOf, verifyRewrite } from '../../lib/resume/verify';
import { extractNumbers } from '../../lib/resume/text';
import { tailorStream } from '../../lib/resume/tailor';
import type { Typesetter } from '../../lib/resume/layout';
import type { fit as fitFn } from '../../lib/resume/fit';
import { useBotStatus } from '../../hooks/useBotStatus';
import { GlyphPile, LIFT_ROWS, LIFT_ROW_H } from './GlyphPile';
import { ResumePaper } from './ResumePaper';

/**
 * Resume personalizer. Type a role or paste a posting:
 *
 *  1. every keystroke: plain JS ranks the bullets and lifts the matching
 *     chips out of the pile (match.ts). Works with no network at all.
 *  2. a beat later: the typesetter fills exactly one page in that order
 *     (fit.ts, layout.ts) and the preview re-sets itself.
 *  3. after a pause, if the chat bot is up: a language model rewords the chosen
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
const ORIGINAL = Object.fromEntries(fragments.map((f) => [f.id, f.text]));

/* Side by side needs room for a readable stage next to a full-height page. */
const SIDE_QUERY = '(min-width: 1000px)';
const PAGE_RATIO = 8.5 / 11;
/* Above the page: the section's padding twice, the toolbar, and its gap. */
const PAGE_CHROME = 16 * 2 + 44 + 12;

/**
 * Controls and page side by side, sized so both fit the window without
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

/**
 * Where the lifted chips land and where the heap starts, measured from the top
 * of the controls column the heap is drawn over. Both move when the field
 * grows, the examples wrap, or "How this works" opens.
 */
function useHeapGeometry(
  box: React.RefObject<HTMLElement | null>,
  lift: React.RefObject<HTMLElement | null>,
  floor: React.RefObject<HTMLElement | null>,
) {
  const [geo, setGeo] = useState({ rowTop: 0, heapTop: 0 });
  useLayoutEffect(() => {
    const els = [box.current, lift.current, floor.current];
    if (els.some((el) => !el)) return;
    const measure = () => {
      const rowTop = lift.current!.offsetTop;
      const heapTop = floor.current!.offsetTop;
      setGeo((g) => (g.rowTop === rowTop && g.heapTop === heapTop ? g : { rowTop, heapTop }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of els) ro.observe(el!);
    return () => ro.disconnect();
  }, [box, lift, floor]);
  return geo;
}

export function Personalizer() {
  const [query, setQuery] = useState('');
  const [settled, setSettled] = useState('');
  const [engine, setEngine] = useState<Engine | null>(null);
  const [engineFailed, setEngineFailed] = useState(false);
  const [rewrites, setRewrites] = useState<{ query: string; byId: Record<string, Rewrite> }>({ query: '', byId: {} });
  const [phase, setPhase] = useState<'idle' | 'rewriting' | 'done' | 'failed'>('idle');
  const [saving, setSaving] = useState(false);
  /* The query the visitor has finished typing: set by Enter, leaving the
     field, picking an example, or a 3 s pause. Rewording waits for it, so a
     request is not started and cancelled on every pause mid-sentence. */
  const [finished, setFinished] = useState('');
  const [nudge, setNudge] = useState(0);
  /* Finished rewrites per query, so going back to a role does not ask again. */
  const cache = useRef(new Map<string, Record<string, Rewrite>>());
  const field = useRef<HTMLTextAreaElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const liftRow = useRef<HTMLDivElement>(null);
  const heapBand = useRef<HTMLDivElement>(null);
  const { rowTop, heapTop } = useHeapGeometry(main, liftRow, heapBand);
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
    const done = setTimeout(() => setFinished(query.trim()), 3000);
    return () => {
      clearTimeout(t);
      clearTimeout(done);
    };
  }, [query]);

  const finish = (q: string) => {
    setSettled(q);
    setFinished(q);
  };

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

  /* Original | Tailored. The choice belongs to one settled query, so a new
     query starts on Tailored again. */
  const [viewState, setViewState] = useState<{ q: string; v: 'tailored' | 'original' }>({ q: '', v: 'tailored' });
  const view = active && viewState.q === settled ? viewState.v : 'tailored';
  const originalFit = useMemo(
    () => (engine ? engine.fit(engine.ts, DEFAULT_RANKING, ORIGINAL, tailorSkillLines('')) : null),
    [engine],
  );
  const shown = view === 'original' && originalFit ? originalFit : fitted;

  /* 3. Rewording, once per finished query. Typing again aborts it. */
  const canRewrite = status === 'online' && !!engine && finished.length >= 4 && finished === settled;
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
    (async () => {
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
        /* Not the visitor's problem: the page stays as picked. The reason is
           for whoever runs the bot. */
        console.warn('[resume] rewording failed:', err instanceof Error ? err.message : err);
        setPhase('failed');
      }
    })();
    return () => ctrl.abort();
  }, [settled, canRewrite, botUrl, nudge]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const q = query.trim();
      if (q === finished && phase === 'failed') setNudge((n) => n + 1); // try again
      finish(q);
    }
    if (e.key === 'Escape') setQuery('');
  };

  /* A pasted posting is long; let the field grow a little, then scroll. */
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [query]);

  const download = async () => {
    if (!engine || !shown) return;
    setSaving(true);
    try {
      const bytes = await engine.ts.pdf(shown.page, shown.scale);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const slug = settled.toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 4).join('-');
      const name = active && view === 'tailored' && slug ? `Genova-Mongalo-Resume-${slug}.pdf` : 'Genova-Mongalo-Resume.pdf';
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
  const okCount = done.filter((r) => r.ok).length;

  const marks: Record<string, 'reworded' | 'kept'> = {};
  const whys: Record<string, string> = {};
  /* For the reworded tooltip: the new wording (diffed against the original
     there) and the figures and tools verify.ts made sure survived. */
  const changes: Record<string, { after: string; facts: string[] }> = {};
  if (view === 'tailored' && rewrites.query === settled) {
    for (const [id, r] of Object.entries(rewrites.byId)) {
      if (r.ok) {
        marks[id] = 'reworded';
        const f = fragById.get(id)!;
        changes[id] = { after: r.text, facts: [...new Set([...extractNumbers(f.text), ...technologiesOf(f)])].slice(0, 6) };
      } else if (r.why.length) {
        marks[id] = 'kept';
        whys[id] = r.why.join(', ');
      }
    }
  }

  /* Step counts for "How this works". */
  const loose = fragments.filter((f) => !f.fixed);
  const answering = loose.filter((f) => (ranking.score.get(f.id) ?? 0) > 0.12).length;
  const rewordLine =
    status !== 'online'
      ? 'the rewording model is offline, so bullets stay as written'
      : phase === 'rewriting'
        ? 'rewording…'
        : phase === 'done'
          ? `${okCount} ${okCount === 1 ? 'bullet' : 'bullets'} reworded`
          : phase === 'failed'
            ? `${okCount} reworded; the model stopped answering, so the rest stay as written`
            : 'waiting for you to stop typing';
  const checkLine = kept.length
    ? `${kept.length} kept as written: the rewrite ${[...kept][0].why[0]}`
    : phase === 'done' && okCount
      ? 'every rewrite kept its facts'
      : status !== 'online'
        ? 'nothing to check, since nothing was reworded'
        : 'nothing to check yet';
  /* Each step's mark has its own shape, so state does not rest on colour:
     filled = done, ring = running, dash = skipped, hollow = not yet. */
  type StepState = 'done' | 'running' | 'skipped' | 'waiting';
  const idle = 'type a role to see this';
  const steps: { name: string; where: string; what: string; result: string; state: StepState }[] = [
    {
      name: 'Match',
      where: 'in your browser, on every keystroke',
      what: 'Scores every bullet against what you typed: shared tools, shared wording, and the kind of work (health, mobile, LLMs, signal processing).',
      result: active ? `${answering} of ${loose.length} bullets answer this` : idle,
      state: active ? 'done' : 'waiting',
    },
    {
      name: 'Fit',
      where: 'a real typesetter, one page',
      what: 'Sets the page exactly as the PDF prints it and adds bullets, best first, until the page is full. A bullet too long for the space left is skipped for a shorter one.',
      result: !active ? idle : fitted ? `${tailorable} fit on one page` : 'setting type…',
      state: !active ? 'waiting' : fitted ? 'done' : 'running',
    },
    {
      name: 'Reword',
      where: 'on a server, after you stop typing',
      what: 'A language model rewrites the chosen bullets to lead with what this role cares about.',
      result: active ? rewordLine : idle,
      state: !active ? 'waiting' : status !== 'online' ? 'skipped' : phase === 'rewriting' ? 'running' : phase === 'done' || phase === 'failed' ? 'done' : 'waiting',
    },
    {
      name: 'Check',
      where: 'code, not a prompt',
      what: 'Code compares each rewrite with the original and throws it out if a number or tool goes missing, a new tool appears, or "built" becomes "led".',
      result: active ? checkLine : idle,
      state: !active ? 'waiting' : status !== 'online' ? 'skipped' : phase === 'done' || (phase === 'failed' && done.length) ? 'done' : phase === 'rewriting' ? 'running' : 'waiting',
    },
  ];

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
            : phase === 'failed' && done.some((r) => r.ok)
              ? `Reworded ${done.filter((r) => r.ok).length} bullets for this role.`
              : !ranking.matched
                ? 'Nothing on the resume matches that, so this is the general version.'
                : 'Picked and ordered for this role.';

  return (
    <section
      ref={section}
      className={`tailor${sideH ? ' is-side' : ''}`}
      aria-labelledby="tailor-title"
      style={sideH ? ({ minHeight: sideH, '--page-h': `${sideH - PAGE_CHROME}px`, '--page-w': `${Math.round((sideH - PAGE_CHROME) * PAGE_RATIO)}px` } as React.CSSProperties) : undefined}
    >
      <div className="tailor-main" ref={main} onPointerEnter={warm}>
        <header className="tailor-intro">
          <h2 id="tailor-title">Get this résumé rewritten for your role.</h2>
          <p>Type a job title or paste the whole post. It still fits on one page, ready as a PDF.</p>
        </header>
        <div className="tailor-field">
          <textarea
            ref={field}
            rows={1}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={warm}
            onBlur={() => finish(query.trim())}
            onKeyDown={onKey}
            placeholder="A job title or a job post"
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
        {/* Stay put after typing, so roles compare with one click each. */}
        <div className="tailor-examples" role="group" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              aria-pressed={query.trim() === ex}
              onClick={() => { warm(); setQuery(ex); finish(ex); }}
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="tailor-lift" ref={liftRow} style={{ height: (LIFT_ROWS - 1) * LIFT_ROW_H + 34 }} aria-hidden="true" />
        <p className="tailor-status" aria-live="polite">
          {note}
          {/* Progress is shown, not announced: one update per bullet is noise. */}
          {phase === 'rewriting' && <span aria-hidden="true"> {done.length} of {tailorable}</span>}
        </p>
        <details className="tailor-how">
          <summary>How this works</summary>
          <ol>
            {steps.map((st) => (
              <li key={st.name} className={`how-step is-${st.state}`}>
                <span className="how-mark" aria-hidden="true" />
                <p className="how-head">
                  <strong>{st.name}</strong> <small>{st.where}</small>
                </p>
                <p className="how-what">{st.what}</p>
                <p className="how-result">
                  <span className="visually-hidden">{st.state === 'skipped' ? 'Skipped: ' : st.state === 'running' ? 'Running: ' : ''}</span>
                  {st.result}
                </p>
              </li>
            ))}
          </ol>
        </details>
        <div className="tailor-heap" ref={heapBand} aria-hidden="true" />
        <GlyphPile chips={CHIPS} lifted={lifted} rowTop={rowTop} reserve={heapTop} />
      </div>

      <div className="tailor-side">
        <div className="tailor-toolbar">
          {active && fitted && (
            <div className="tailor-switch" role="radiogroup" aria-label="Which version to show">
              {(['original', 'tailored'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setViewState({ q: settled, v })}
                >
                  {v === 'original' ? 'Original' : 'Tailored'}
                </button>
              ))}
            </div>
          )}
          {/* While rewording, the button is the progress bar: the eye is already
              here, waiting to download. The status line announces it. */}
          <button
            type="button"
            className={`btn btn-solid${phase === 'rewriting' ? ' is-progress' : ''}`}
            onClick={download}
            disabled={!fitted || saving || phase === 'rewriting'}
            style={phase === 'rewriting' ? ({ '--progress': tailorable ? done.length / tailorable : 0 } as React.CSSProperties) : undefined}
          >
            {saving
              ? 'Saving…'
              : phase === 'rewriting'
                ? `Rewording ${done.length} of ${tailorable}…`
                : active ? 'Download this version' : 'Download PDF'}
          </button>
        </div>
        <div className="resume-frame">
          {shown ? (
            <ResumePaper
              plan={shown.plan}
              marks={marks}
              originals={ORIGINAL}
              whys={whys}
              changes={changes}
              label={active && view === 'tailored' ? `Resume tailored to: ${settled.slice(0, 80)}` : 'Resume of Genova Mongalo'}
            />
          ) : (
            <div className="resume-placeholder" aria-busy="true">
              {engineFailed ? 'The resume did not load.' : 'Setting type…'}
            </div>
          )}
        </div>
      </div>

      <p className="tailor-trust">
        Nothing is invented. Every fact comes from the published résumé, and code throws out any rewrite that drops a
        number, adds a tool or claims more.
      </p>
    </section>
  );
}
