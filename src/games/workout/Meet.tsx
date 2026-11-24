import { useEffect, useRef, useState } from 'react';
import type { Attempt, MeetResult, State } from './engine';
import { judgeLights, meetName, meetResult, nextWeights, openers, PERKS, pressMeter, tapesUnlocked } from './engine';
import { sfx } from './audio';

type Props = {
  s: State;
  /** The lifter's max when the meet was entered: it sets every weight. */
  max: number;
  lifter: string;
  onDone: (res: MeetResult) => void;
  onCancel: () => void;
  /** Called when the first attempt is judged: from then on the meet counts. */
  onLock: () => void;
  announce: (msg: string) => void;
};

type Phase = 'pick' | 'lift' | 'judged' | 'done';
const PLACE = ['No place', '1st place', '2nd place', '3rd place'];

/** Three attempts on the platform: pick a weight, stop the needle in the green. */
export function Meet({ s, max, lifter, onDone, onCancel, onLock, announce }: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [weight, setWeight] = useState(0);
  const [zone, setZone] = useState({ c: 0.5, width: 0.3, sweepS: 1 });
  const [result, setResult] = useState<MeetResult | null>(null);
  const needle = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const started = useRef(0);
  const stopped = useRef(false);
  const press = useRef<HTMLButtonElement>(null);
  const sound = s.sound;

  const last = attempts[attempts.length - 1];
  const choices = attempts.length === 0 ? openers(max) : nextWeights(max, last);

  const pick = (w: number) => {
    const m = pressMeter(w, max, s.meet);
    const lo = m.width / 2 + 0.06;
    setZone({ ...m, c: lo + Math.random() * (1 - 2 * lo) });
    setWeight(w);
    stopped.current = false;
    started.current = performance.now();
    setPhase('lift');
  };

  /* Keep focus in the meet: the press button disables once stopped, which
     would otherwise drop focus to the page. */
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === 'pick') root.current?.querySelector<HTMLElement>('.wk-weight')?.focus({ preventScroll: true });
    if (phase === 'done') root.current?.querySelector<HTMLElement>('.wk-podium-card .btn')?.focus({ preventScroll: true });
  }, [phase]);

  /* The needle sweeps back and forth until it's stopped. */
  useEffect(() => {
    if (phase !== 'lift') return;
    press.current?.focus({ preventScroll: true });
    let raf = 0;
    const loop = (now: number) => {
      const u = ((now - started.current) / 1000 / zone.sweepS) % 2;
      pos.current = u < 1 ? u : 2 - u;
      if (needle.current) needle.current.style.left = `${pos.current * 100}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, zone.sweepS]);

  const stop = () => {
    if (phase !== 'lift' || stopped.current) return;
    stopped.current = true;
    const whites = judgeLights(pos.current, zone.c, zone.width);
    const a: Attempt = { weight, whites, made: whites >= 2 };
    const all = [...attempts, a];
    setAttempts(all);
    if (all.length === 1) onLock();
    setPhase('judged');
    if (sound) [0, 1, 2].forEach((i) => sfx.light(i < whites, i));
    announce(`${a.made ? 'Good lift' : 'No lift'}: ${weight} lb, ${whites} of 3 white lights.`);
    window.setTimeout(() => {
      if (all.length < 3) {
        setPhase('pick');
        return;
      }
      const res = meetResult(s, max, all);
      setResult(res);
      setPhase('done');
      if (sound) sfx.podium();
      announce(`${PLACE[res.place]} at the ${meetName(s.meet)}. ${res.medals} medal${res.medals === 1 ? '' : 's'} won.`);
    }, 1400);
  };

  if (phase === 'done' && result) {
    return (
      <div className="wk-meet" ref={root}>
        <div className="wk-podium-card">
          <p className="wk-meet-kicker">{meetName(s.meet)} · result</p>
          <p className="wk-place">{PLACE[result.place]}</p>
          <div className="wk-podium" aria-hidden="true">
            {[2, 1, 3].map((p) => (
              <span key={p} className={`wk-step wk-step-${p}${result.place === p ? ' is-you' : ''}`}>{p}</span>
            ))}
          </div>
          <p className="wk-medals-won">
            +{result.medals} medal{result.medals === 1 ? '' : 's'}
            <span>Each adds +10% to all Gains, for good.</span>
          </p>
          {result.best > 0 && <p className="wk-meet-note">Best lift {result.best} lb against a {max} lb max.</p>}
          {result.place === 0 && <p className="wk-meet-note">No lifts made. Showing up still earns a medal.</p>}
          {result.perk && <p className="wk-perk">New perk: {PERKS[result.perk]}</p>}
          {tapesUnlocked({ ...s, meet: s.meet + 1 }) > tapesUnlocked(s) && <p className="wk-perk">New tape on the gym TV</p>}
          <p className="wk-meet-note">Gains, equipment, robots and technique start over. Medals and perks stay.</p>
          <button type="button" className="btn btn-solid wk-big" onClick={() => onDone(result)}>
            Start the next run
          </button>
        </div>
      </div>
    );
  }

  const lights = phase === 'judged' ? last.whites : -1;

  return (
    <div className="wk-meet" ref={root}>
      <div className="wk-meet-head">
        <p className="wk-meet-kicker">{meetName(s.meet)}</p>
        <p className="wk-meet-sub">
          Attempt {Math.min(attempts.length + (phase === 'judged' ? 0 : 1), 3)} of 3 · your max {max} lb
        </p>
      </div>

      <div className="wk-lights" role="img" aria-label={lights < 0 ? 'Judge lights off' : `${lights} white, ${3 - lights} red`}>
        {[0, 1, 2].map((i) => (
          <span
            key={`${attempts.length}-${i}`}
            className={`wk-light${lights < 0 ? '' : i < lights ? ' is-white' : ' is-red'}`}
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>

      <div className="wk-platform">
        <img src={lifter} alt="" className="wk-platform-lifter" />
      </div>

      {phase === 'pick' && (
        <div className="wk-meet-pick">
          <p className="wk-meet-q">
            {attempts.length === 0 ? 'Pick your opener' : last.made ? 'Good lift. Go heavier:' : 'No lift. Try it again:'}
          </p>
          <div className="wk-weights">
            {choices.map((w, i) => (
              <button key={w} type="button" className="wk-weight" onClick={() => pick(w)}>
                <strong>{w} lb</strong>
                <span>
                  {attempts.length === 0 ? ['Safe, 90%', 'Solid, 100%', 'Reach, 105%'][i] : `${Math.round((w / max) * 100)}% of max`}
                </span>
              </button>
            ))}
          </div>
          {attempts.length === 0 && (
            <button type="button" className="btn btn-quiet wk-back-out" onClick={onCancel}>
              Not yet, keep training
            </button>
          )}
        </div>
      )}

      {phase !== 'pick' && (
        <div className="wk-meter-wrap">
          <div className="wk-meter" aria-hidden="true">
            <div
              className="wk-zone"
              style={{ left: `${(zone.c - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }}
            />
            <div className="wk-needle" ref={needle} style={{ left: `${pos.current * 100}%` }} />
          </div>
          <button
            ref={press}
            type="button"
            className="btn btn-solid wk-big wk-press"
            disabled={phase !== 'lift'}
            onPointerDown={(e) => {
              if (e.button === 0) stop();
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                stop();
              }
            }}
            onClick={stop}
          >
            {phase === 'lift' ? `Press ${weight} lb` : last.made ? 'Good lift!' : 'No lift'}
          </button>
          <p className="wk-meet-note">Stop the needle in the green. Heavier weights mean a smaller zone and a faster needle.</p>
        </div>
      )}

      {attempts.length > 0 && (
        <ol className="wk-attempts">
          {attempts.map((a, i) => (
            <li key={i} className={a.made ? 'is-made' : 'is-miss'}>
              {a.weight} lb · {a.made ? 'good' : 'no lift'}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
