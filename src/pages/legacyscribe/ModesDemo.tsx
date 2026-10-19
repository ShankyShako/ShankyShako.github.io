import { useEffect, useRef, useState } from 'react';
import { usePlayOnce } from './usePlayOnce';

const MODES = ['Raw', 'Clean', 'Prompt'] as const;
const STEP_MS = 1600;

const SAID =
  'okay so um I need the login page to remember the email no actually remember the whole form and uh can we also add a test for the empty email case';

const OUT: Record<(typeof MODES)[number], string[]> = {
  Raw: [SAID],
  Clean: ['I need the login page to remember the whole form. Can we also add a test for the empty email case?'],
  Prompt: [
    '1. Make the login page remember the whole form, not only the email.',
    '2. Can we also add a test for the empty-email case?',
  ],
};

/** Raw, Clean and Prompt on one dictation. Steps through them once, then the pills are yours. */
export function ModesDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, reduced, run, finish, replay } = usePlayOnce(ref);
  const [index, setIndex] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (phase !== 'playing') return;
    setIndex(0);
    const t1 = window.setTimeout(() => setIndex(1), STEP_MS);
    const t2 = window.setTimeout(() => setIndex(2), STEP_MS * 2);
    const t3 = window.setTimeout(finish, STEP_MS * 3);
    return () => [t1, t2, t3].forEach(window.clearTimeout);
  }, [phase, run, finish]);

  const interactive = phase === 'done';

  return (
    <div className="ls-modes" ref={ref}>
      <div className="ls-pillscroll">
        <div className="ls-pills" role="group" aria-label="Mode">
          <span className="ls-pill-slider" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
          {MODES.map((m, i) => (
            <button
              key={m}
              type="button"
              className="ls-pill"
              aria-pressed={index === i}
              disabled={!interactive}
              onClick={() => setIndex(i)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="ls-modes-cols">
        <div className="ls-card">
          <div className="ls-card-label">You said</div>
          <p>{SAID}</p>
        </div>
        <div className="ls-card ls-card-out">
          <div className="ls-card-label">Pasted as {MODES[index]}</div>
          <div className="ls-stack">
            {MODES.map((m, i) => (
              <div key={m} className="ls-stack-item" style={{ opacity: index === i ? 1 : 0 }} aria-hidden={index !== i}>
                {OUT[m].map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ))}
          </div>
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
