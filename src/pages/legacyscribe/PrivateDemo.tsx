import { useEffect, useRef, useState } from 'react';
import { usePlayOnce } from './usePlayOnce';

const STAGES = ['Recording', 'Transcribing', 'Rewriting', 'Pasted'];

/** Private mode goes on, a lock appears, a dictation runs, and the socket count stays 0. */
export function PrivateDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const { phase, reduced, run, finish, replay } = usePlayOnce(ref);
  const [on, setOn] = useState(reduced);
  const [lock, setLock] = useState(reduced);
  const [stage, setStage] = useState(reduced ? STAGES.length - 1 : -1);

  useEffect(() => {
    if (phase !== 'playing') return;
    setOn(false);
    setLock(false);
    setStage(-1);
    const timers = [
      window.setTimeout(() => setOn(true), 300),
      window.setTimeout(() => setLock(true), 650),
      ...STAGES.map((_, i) => window.setTimeout(() => setStage(i), 1000 + i * 550)),
      window.setTimeout(finish, 1000 + STAGES.length * 550),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [phase, run, finish]);

  return (
    <div className="ls-private" ref={ref}>
      <div className="ls-card ls-private-card">
        <div className="ls-private-top">
          <div className="ls-switch-row">
            <span id="ls-private-label">Private mode</span>
            <span
              className={on ? 'ls-switch is-on' : 'ls-switch'}
              role="img"
              aria-labelledby="ls-private-label"
              aria-describedby="ls-private-state"
            >
              <span className="ls-knob" />
            </span>
            <span className="ls-sr" id="ls-private-state">{on ? 'on' : 'off'}</span>
          </div>
          <div className="ls-menubar" aria-hidden="true">
            <span className="ls-mb-dot" />
            <span className="ls-mb-dot" />
            <span className="ls-mb-icon">
              <img src="/image/legacyscribe-icon.png" alt="" width="18" height="18" />
              <svg className="ls-mb-lock" style={{ opacity: lock ? 1 : 0 }} viewBox="0 0 12 12" width="10" height="10">
                <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="#1d1d1f" />
                <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="#1d1d1f" strokeWidth="1.4" />
              </svg>
            </span>
          </div>
        </div>
        <ol className="ls-stages">
          {STAGES.map((s, i) => (
            <li key={s} style={{ opacity: stage === i ? 1 : 0.35 }} aria-current={stage === i ? 'step' : undefined}>
              {s}
            </li>
          ))}
        </ol>
        <div className="ls-net">
          Network connections opened: <b>0</b>
        </div>
        <p className="ls-cap">
          Checked by a test that samples the app's sockets every 10 ms during a real dictation.
        </p>
      </div>
      {phase === 'done' && !reduced && (
        <button type="button" className="ls-replay" onClick={replay}>
          Replay
        </button>
      )}
    </div>
  );
}
