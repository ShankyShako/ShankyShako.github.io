import { useEffect, useRef, useState } from 'react';
import { usePlayOnce } from './usePlayOnce';

const WORDS = 'so um I think we should like move the meeting to uh Thursday'.split(' ');
/* word index -> which counter it ticks */
const FILLERS = new Set([1, 11]); // um, uh
const CRUTCH = new Set([6]); // like
const TOTAL_MS = 3000;
const STEP = TOTAL_MS / WORDS.length;

/** A playhead passes over one dictation; each filler it meets is marked and counted. */
export function CoachDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, reduced, run, finish, replay } = usePlayOnce(ref);
  /* How many words the playhead has left behind. */
  const [passed, setPassed] = useState(reduced ? WORDS.length : 0);

  useEffect(() => {
    if (phase !== 'playing') return;
    setPassed(0);
    const timers = WORDS.map((_, i) => window.setTimeout(() => setPassed(i + 1), STEP * (i + 1)));
    timers.push(window.setTimeout(finish, TOTAL_MS + 200));
    return () => timers.forEach(window.clearTimeout);
  }, [phase, run, finish]);

  const fillers = [...FILLERS].filter((i) => i < passed).length;
  const crutch = [...CRUTCH].filter((i) => i < passed).length;

  return (
    <div className="ls-coach" ref={ref}>
      <div className="ls-card ls-coach-main">
        <div className="ls-card-label">A dictation, counted</div>
        <p className="ls-coach-line">
          <span className="ls-sr">{WORDS.join(' ')}</span>
          {WORDS.map((w, i) => {
            const marked = (FILLERS.has(i) || CRUTCH.has(i)) && i < passed;
            const left = i < passed;
            return (
              <span key={i} aria-hidden="true">
                {i > 0 && ' '}
                <span
                  className={marked ? 'ls-w ls-w-mark' : 'ls-w'}
                  style={{ opacity: left && !marked ? 0.6 : 1 }}
                >
                  {w}
                </span>
              </span>
            );
          })}
        </p>
        <div className="ls-counters">
          <div>
            <span className="ls-count">{fillers}</span> Fillers
          </div>
          <div>
            <span className="ls-count">{crutch}</span> Crutch words
          </div>
        </div>
      </div>
      <div className="ls-card ls-coach-good">
        <div className="ls-card-label">A clean sentence of yours</div>
        <p className="ls-good">Let's move the meeting to Thursday.</p>
      </div>
      {phase === 'done' && !reduced && (
        <button type="button" className="ls-replay" onClick={replay}>
          Replay
        </button>
      )}
    </div>
  );
}
