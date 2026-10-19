import { useEffect, useRef, useState } from 'react';
import { usePlayOnce } from './usePlayOnce';

const SAID = "so um let's move the demo to friday no thursday at two and uh I'll bring the poster".split(' ');
const TYPED = "Let's move the demo to Thursday at 2. I'll bring the poster.";
const WORD_MS = 170;
const BAR_TICK_MS = 120;
/* A fixed, repeating shape for the capsule bars: speech-like, not random. */
const BAR_SHAPES = [0.4, 0.7, 1, 0.6, 0.8, 0.45, 0.65];

type Stage = 'idle' | 'recording' | 'transcribing' | 'rewriting' | 'typed';

/** Frame A's window: a message box, the capsule and the live caption. ~4.6 s, plays once. */
export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, reduced, run, finish, replay } = usePlayOnce(ref, { startAfterMs: 400 });
  const [stage, setStage] = useState<Stage>(reduced ? 'typed' : 'idle');
  const [words, setWords] = useState(reduced ? SAID.length : 0);
  const [tick, setTick] = useState(0);
  const [captionOn, setCaptionOn] = useState(true);
  const [landed, setLanded] = useState(reduced);
  const [settled, setSettled] = useState(reduced);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    setStage('recording');
    setWords(0);
    setTick(0);
    setLanded(false);
    setSettled(false);
    setCaptionOn(true);

    SAID.forEach((_, i) => at(WORD_MS * (i + 1), () => setWords(i + 1)));
    const bars = window.setInterval(() => setTick((t) => t + 1), BAR_TICK_MS);

    const talkEnd = WORD_MS * (SAID.length + 1);
    at(talkEnd, () => {
      window.clearInterval(bars);
      setStage('transcribing');
    });
    at(talkEnd + 500, () => setStage('rewriting'));
    at(talkEnd + 1000, () => {
      setStage('typed');
      setCaptionOn(false); // fades out over 200 ms
      setLanded(true);
    });
    at(talkEnd + 1200, () => setCaptionOn(true)); // the caption comes back, static, beneath
    at(talkEnd + 1400, () => setSettled(true)); // the landing highlight fades over 600 ms
    at(talkEnd + 2000, finish);

    return () => {
      window.clearInterval(bars);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [phase, run, finish]);

  const shape = BAR_SHAPES.map((_, i) =>
    stage === 'recording' ? BAR_SHAPES[(i + tick) % BAR_SHAPES.length] : BAR_SHAPES[i],
  );

  return (
    <div className="ls-hero-demo" ref={ref}>
      <p className="ls-sr">
        Demo. You say: {SAID.join(' ')}. LegacyScribe types: {TYPED}
      </p>
      <div className="ls-win" aria-hidden="true">
        <div className="ls-win-bar">
          <i />
          <i />
          <i />
          <span>Messages</span>
        </div>
        <div className="ls-win-body">
          <div className="ls-msg">
            <div className="ls-to">To: Sam</div>
            Are we still on for the demo Friday?
          </div>
          <div className="ls-field">
            <span className="ls-typed" style={{ opacity: landed ? 1 : 0 }}>
              {TYPED}
              <span className="ls-typed-flash" style={{ opacity: landed && !settled ? 1 : 0 }} />
            </span>
          </div>
        </div>
      </div>
      <div className="ls-said" aria-hidden="true">
        <div className="ls-capsule">
          <span className="ls-capsule-bg" />
          <span className="ls-capsule-bg ls-tint-blue" style={{ opacity: stage === 'transcribing' ? 1 : 0 }} />
          <span className="ls-capsule-bg ls-tint-purple" style={{ opacity: stage === 'rewriting' ? 1 : 0 }} />
          {shape.map((h, i) => (
            <b key={i} style={{ transform: `scaleY(${h})` }} />
          ))}
        </div>
        <div className="ls-caption" style={{ opacity: captionOn && words > 0 ? 1 : 0 }}>
          {SAID.slice(0, words).map((w, i) => (
            <span key={i} className={i === words - 1 ? 'ls-dim' : undefined}>
              {i > 0 && ' '}
              {w}
            </span>
          ))}
        </div>
        <div className="ls-whatlabel" style={{ opacity: phase === 'done' ? 1 : 0 }}>
          What you said, as the live caption showed it
        </div>
      </div>
      {phase === 'done' && !reduced && (
        <button type="button" className="ls-replay" onClick={replay}>
          Replay
        </button>
      )}
    </div>
  );
}
