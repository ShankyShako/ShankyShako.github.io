import { useEffect, useRef, useState } from 'react';
import type { MeetResult, State } from './engine';
import { battleResult, judgeLights, meetName, PERKS, pressMeter, tapesUnlocked } from './engine';
import type { Side, Throw, Tier } from './battle';
import { applyCred, FOE, foeLift, foePick, PLAYER, randomThrow, resolve, rps, START_CRED, THROWS, TIERS, tierWeights } from './battle';
import { sfx } from './audio';

type Props = {
  s: State;
  /** The lifter's max when the meet was entered: it sets every weight. */
  max: number;
  lifter: string;
  onDone: (res: MeetResult) => void;
  onCancel: () => void;
  /** Called when the first lift is judged: from then on the meet counts. */
  onLock: () => void;
  announce: (msg: string) => void;
};

type Phase = 'intro' | 'throw' | 'reveal' | 'choose' | 'foePick' | 'lift' | 'judged' | 'foeLift' | 'outcome' | 'done';
type Cred = Record<Side, number>;
const PLACE = ['No place', '1st place', '2nd place', '3rd place'];
const THROW_NAME: Record<Throw, string> = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };
const INTRO_MS = 1900;
/* Phases with no buttons: the narration gets the box. */
const TALK: Phase[] = ['reveal', 'foePick', 'foeLift', 'outcome'];
/* Phases that show the weight and who carries the risk. */
const STAKES: Phase[] = ['foePick', 'lift', 'judged', 'foeLift', 'outcome'];

/** The meet as a battle: CHAD against his evil twin, round after round of
    rock-paper-scissors for the pick, then both lift it. Rules: battle.ts. */
export function Meet({ s, max, lifter, onDone, onCancel, onLock, announce }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(1);
  const [cred, setCred] = useState<Cred>({ you: START_CRED, foe: START_CRED });
  const [throws, setThrows] = useState<Partial<Record<Side, Throw>>>({});
  const [tier, setTier] = useState<Tier>(1);
  const [lights, setLights] = useState<Cred>({ you: -1, foe: -1 });
  const [fx, setFx] = useState<{ side: Side; kind: 'hit' | 'heal'; n: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [zone, setZone] = useState({ c: 0.5, width: 0.3, sweepS: 1 });
  const [result, setResult] = useState<MeetResult | null>(null);

  const credRef = useRef(cred);
  credRef.current = cred;
  const made = useRef<number[]>([]);
  const locked = useRef(false);
  const needle = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const started = useRef(0);
  const stopped = useRef(false);
  const press = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const picker = useRef<Side>('you');
  const sound = s.sound;
  const weights = tierWeights(max);

  const later = (ms: number, f: () => void) => {
    timers.current.push(window.setTimeout(f, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const say = (m: string) => {
    setMsg(m);
    announce(m);
  };

  /* ---------- Intro: the VS screen ---------- */
  useEffect(() => {
    if (sound) sfx.vs();
    later(INTRO_MS, () => startRound(1));
  }, []);

  const skipIntro = () => {
    if (phase !== 'intro') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    startRound(1);
  };

  /* ---------- A round ---------- */
  const startRound = (n: number) => {
    setRound(n);
    setThrows({});
    setLights({ you: -1, foe: -1 });
    setFx(null);
    setPhase('throw');
    say(n === 1 ? `${FOE} wants your cred. Rock, paper, scissors: the winner picks the weight.` : `Round ${n}. Throw!`);
  };

  const throwHand = (you: Throw) => {
    if (phase !== 'throw') return;
    const foe = randomThrow();
    const w = rps(you, foe);
    setThrows({ you, foe });
    setPhase('reveal');
    if (sound) sfx.reveal();
    say(`You threw ${THROW_NAME[you]}. ${FOE} threw ${THROW_NAME[foe]}.`);
    later(1200, () => {
      if (w === 'tie') {
        setThrows({});
        setPhase('throw');
        say('A tie. Throw again!');
      } else if (w === 'you') {
        setPhase('choose');
        say(`You won the throw. Pick the weight, or let ${FOE} pick.`);
      } else {
        foeChooses(false);
      }
    });
  };

  /** He picks: he won the throw, or you handed him the pick. */
  const foeChooses = (handed: boolean) => {
    const t = foePick(credRef.current);
    picker.current = 'foe';
    setTier(t);
    setPhase('foePick');
    say(
      handed
        ? `You hand ${FOE} the pick. He goes ${TIERS[t].name}: ${weights[t]} lb. His risk now.`
        : `${FOE} won the throw. He picks ${TIERS[t].name}: ${weights[t]} lb.`,
    );
    later(1700, () => beginLift(t, 'foe'));
  };

  const beginLift = (t: Tier, by: Side) => {
    picker.current = by;
    setTier(t);
    const m = pressMeter(weights[t], max, s.meet);
    const lo = m.width / 2 + 0.06;
    setZone({ ...m, c: lo + Math.random() * (1 - 2 * lo) });
    stopped.current = false;
    started.current = performance.now();
    setPhase('lift');
    say(`Your lift: ${weights[t]} lb. Stop the needle in the green.`);
  };

  /* The needle sweeps back and forth until it's stopped. */
  useEffect(() => {
    if (phase !== 'lift') return;
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
    const youMade = whites >= 2;
    if (youMade) made.current.push(weights[tier]);
    if (!locked.current) {
      locked.current = true;
      onLock();
    }
    setLights({ you: whites, foe: -1 });
    setPhase('judged');
    if (sound) [0, 1, 2].forEach((i) => sfx.light(i < whites, i));
    say(`${youMade ? 'Good lift!' : 'No lift.'} ${whites} of 3 white lights. Now ${FOE}.`);

    later(1300, () => {
      const foe = foeLift(tier, s.meet);
      setLights({ you: whites, foe: foe.whites });
      setPhase('foeLift');
      if (sound) [0, 1, 2].forEach((i) => sfx.light(i < foe.whites, i));
      say(`${FOE}: ${foe.made ? 'good lift' : 'no lift'}, ${foe.whites} of 3 white lights.`);
      later(1300, () => settle(youMade, foe.made));
    });
  };

  const settle = (youMade: boolean, foeMade: boolean) => {
    const by = picker.current;
    const d = resolve(tier, by, youMade, foeMade);
    const next = { you: applyCred(credRef.current.you, d.you), foe: applyCred(credRef.current.foe, d.foe) };
    setCred(next);
    setPhase('outcome');
    const loser: Side | null = d.you < 0 ? 'you' : d.foe < 0 ? 'foe' : null;
    if (loser) {
      setFx({ side: loser, kind: 'hit', n: round });
      if (sound) sfx.hit();
      const healer: Side = loser === 'you' ? 'foe' : 'you';
      if (d[healer] > 0) later(500, () => {
        setFx({ side: healer, kind: 'heal', n: round });
        if (sound) sfx.heal();
      });
    }
    say(outcomeLine(youMade, foeMade, by, d));
    later(2000, () => {
      if (next.you > 0 && next.foe > 0) {
        startRound(round + 1);
        return;
      }
      const won = next.foe <= 0;
      const res = battleResult(s, won, next.you, made.current);
      setResult(res);
      setPhase('done');
      if (sound) (won ? sfx.podium : sfx.hit)();
      announce(
        `${won ? `You beat ${FOE} with ${next.you} cred left` : `${FOE} took all your cred`}. ${PLACE[res.place]} at the ${meetName(s.meet)}. ${res.medals} medal${res.medals === 1 ? '' : 's'} won.`,
      );
    });
  };

  /* Keep focus inside the battle: buttons come and go between phases. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (phase === 'intro') el.querySelector<HTMLElement>('.wk-vs')?.focus({ preventScroll: true });
    else if (phase === 'lift') press.current?.focus({ preventScroll: true });
    else if (phase === 'done') el.querySelector<HTMLElement>('.wk-podium-card .btn')?.focus({ preventScroll: true });
    else {
      const b = el.querySelector<HTMLElement>('.wk-bt-actions button');
      (b ?? el.querySelector<HTMLElement>('.wk-bt-box'))?.focus({ preventScroll: true });
    }
  }, [phase]);

  if (phase === 'done' && result) {
    const won = cred.foe <= 0;
    return (
      <div className="wk-meet" ref={root}>
        <div className="wk-podium-card">
          <p className="wk-meet-kicker">{meetName(s.meet)} · result</p>
          <p className="wk-place">{PLACE[result.place]}</p>
          <p className="wk-meet-note wk-bt-verdict">
            {won ? `Beat ${FOE} with ${cred.you} cred left.` : `${FOE} took all your cred.`}
          </p>
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
          {result.place === 0 && <p className="wk-meet-note">Showing up still earns a medal. Train up and take him next meet.</p>}
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

  const fighter = (side: Side) => (
    <div
      key={fx && fx.side === side ? `${side}-${fx.kind}-${fx.n}` : side}
      className={`wk-bt-fighter is-${side}${fx && fx.side === side ? ` is-${fx.kind}` : ''}`}
    >
      <div className="wk-bt-pad">
        <img src={lifter} alt="" className={`wk-bt-sprite${side === 'foe' ? ' is-evil' : ''}`} draggable={false} />
      </div>
      {throws[side] && phase === 'reveal' && <span className="wk-bt-throw">{THROW_NAME[throws[side]!]}!</span>}
    </div>
  );

  const card = (side: Side) => {
    const c = cred[side];
    const level = c > 50 ? 'is-high' : c > 20 ? 'is-mid' : 'is-low';
    return (
      <div className={`wk-bt-card is-${side}${fx && fx.side === side && fx.kind === 'heal' ? ' is-heal' : ''}`}>
        <div className="wk-bt-head">
          <p className="wk-bt-name">{side === 'you' ? PLAYER : FOE}</p>
          <div
            className="wk-lights wk-bt-lights"
            role="img"
            aria-label={lights[side] < 0 ? 'Judge lights off' : `${lights[side]} white, ${3 - lights[side]} red`}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={`${round}-${lights[side] < 0 ? 'off' : 'on'}-${i}`}
                className={`wk-light${lights[side] < 0 ? '' : i < lights[side] ? ' is-white' : ' is-red'}`}
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="wk-bt-bar" role="meter" aria-label={`${side === 'you' ? PLAYER : FOE} cred`} aria-valuemin={0} aria-valuemax={START_CRED} aria-valuenow={c}>
          <span className="wk-bt-bar-label">CRED</span>
          <span className="wk-bt-track">
            <span className={`wk-bt-fill ${level}`} style={{ width: `${(c / START_CRED) * 100}%` }} />
          </span>
        </div>
        <p className="wk-bt-num">
          {c}
          <span> / {START_CRED}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="wk-battle" ref={root}>
      {phase === 'intro' && (
        <button type="button" className="wk-vs" onClick={skipIntro} aria-label={`${PLAYER} versus ${FOE}. Start the battle.`}>
          <span className="wk-vs-half is-you" aria-hidden="true">
            <img src={lifter} alt="" draggable={false} />
            <strong>{PLAYER}</strong>
          </span>
          <span className="wk-vs-half is-foe" aria-hidden="true">
            <img src={lifter} alt="" className="is-evil" draggable={false} />
            <strong>{FOE}</strong>
          </span>
          <span className="wk-vs-mark" aria-hidden="true">VS</span>
          <span className="wk-vs-meet" aria-hidden="true">{meetName(s.meet)}</span>
          <span className="wk-vs-skip" aria-hidden="true">Tap to start</span>
        </button>
      )}

      <div className="wk-bt-field">
        {card('foe')}
        {fighter('foe')}
        {fighter('you')}
        {card('you')}
      </div>

      <div className={`wk-bt-box${TALK.includes(phase) ? ' is-talk' : ''}`} tabIndex={-1}>
        <p className="wk-bt-round">
          {meetName(s.meet)} · Round {round}
        </p>
        <p className="wk-bt-msg">{msg}</p>

        {phase === 'throw' && (
          <div className="wk-bt-actions wk-bt-three">
            {THROWS.map((t) => (
              <button key={t} type="button" className="wk-bt-btn" onClick={() => throwHand(t)}>
                {THROW_NAME[t]}
              </button>
            ))}
          </div>
        )}

        {phase === 'choose' && (
          <>
            <div className="wk-bt-actions wk-bt-three">
              {TIERS.map((t, i) => (
                <button key={t.name} type="button" className="wk-bt-btn wk-bt-weight" onClick={() => beginLift(i as Tier, 'you')}>
                  <strong>{t.name}</strong>
                  <span>{weights[i]} lb</span>
                  <em>stake {t.stake}</em>
                </button>
              ))}
              <button type="button" className="wk-bt-btn wk-bt-hand" onClick={() => foeChooses(true)}>
                Let {FOE} pick
              </button>
            </div>
            <p className="wk-bt-rule">
              The picker takes the risk: miss your own pick and you lose 1.5× the stake. Make it while he misses and you win back half.
            </p>
          </>
        )}

        {(phase === 'lift' || phase === 'judged') && (
          <div className="wk-bt-actions wk-meter-wrap">
            <div className="wk-meter" aria-hidden="true">
              <div className="wk-zone" style={{ left: `${(zone.c - zone.width / 2) * 100}%`, width: `${zone.width * 100}%` }} />
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
              {phase === 'lift' ? `Press ${weights[tier]} lb` : lights.you >= 2 ? 'Good lift!' : 'No lift'}
            </button>
          </div>
        )}

        {STAKES.includes(phase) && (
          <p className="wk-bt-stakes">
            <strong>
              {TIERS[tier].name} · {weights[tier]} lb
            </strong>
            <span>
              {picker.current === 'you'
                ? `Your pick: miss and lose ${Math.round(TIERS[tier].stake * 1.5)}; make it while he misses for +${Math.round(TIERS[tier].stake / 2)}.`
                : `${FOE}'s pick: he loses ${Math.round(TIERS[tier].stake * 1.5)} if he misses.`}
            </span>
          </p>
        )}

        {!locked.current && phase === 'throw' && (
          <button type="button" className="btn btn-quiet wk-back-out" onClick={onCancel}>
            Not yet, keep training
          </button>
        )}
      </div>
    </div>
  );
}

/** The narration for a round's cred change. */
function outcomeLine(youMade: boolean, foeMade: boolean, by: Side, d: Cred) {
  if (youMade === foeMade) return youMade ? 'Both made it. Dead even.' : 'Both missed. Dead even.';
  if (!youMade) {
    const own = by === 'you' ? ' on your own pick' : '';
    return `You missed${own}: −${-d.you} cred.${d.foe > 0 ? ` ${FOE} wins back ${d.foe}.` : ''}`;
  }
  const own = by === 'foe' ? ' on his own pick' : '';
  return `${FOE} missed${own}! −${-d.foe} cred to him.${d.you > 0 ? ` You win back ${d.you}.` : ''}`;
}
