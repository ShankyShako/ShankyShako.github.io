import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { Judge, MeetResult, NodeId, State } from './engine';
import {
  BEAT_MS,
  bodyStage,
  buyNode,
  buyRobot,
  equipBonus,
  fmt,
  fmtRate,
  fmtTime,
  FORFEIT,
  fresh,
  hasGold,
  judgeTap,
  maxLb,
  medalMult,
  meetName,
  meetOpen,
  meetReq,
  MODEL_S_AT,
  newRun,
  offline,
  offlineCapS,
  nodeCost,
  nodeName,
  PERKS,
  REP_MS,
  repBase,
  restore,
  rep,
  ROBOT_CYCLE_S,
  robotCost,
  robotCount,
  robotPayout,
  robotRate,
  ROBOTS,
  robotVisible,
  SAVE_KEY,
  streakBonus,
  streakCap,
  tapesUnlocked,
  TREE,
  treeNode,
  treeReady,
} from './engine';
import { music, sfx, shutdown, wake } from './audio';
import { Meet } from './Meet';
import { GymBackdrop } from './GymBackdrop';
import { GymTV } from './GymTV';
import { SkillTree } from './SkillTree';
import './workout.css';

/* The owner's 2021 drawings, cropped and shrunk by
   assets-src/games/tools/workout_sprites.py. */
const art = import.meta.glob('./art/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const sprite = (name: string) => art[`./art/${name}.webp`];
const lifterSrc = (s: State, frame: 1 | 2) => sprite(`${hasGold(s) ? 's' : ''}${bodyStage(s)}-${frame}`);
const robotSrc = (s: State, frame: 1 | 2) => sprite(`${s.robots[0] >= MODEL_S_AT ? 's' : ''}robot-${frame}`);

function load(): State {
  let s = fresh();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) s = restore(JSON.parse(raw));
  } catch {
    /* No storage (private mode, blocked): the game runs without saving. */
  }
  const now = Date.now();
  /* Reloaded mid-meet: the meet counts as no lift, so it can't be re-rolled. */
  if (s.inMeet) s = newRun(s, FORFEIT);
  const away = s.away ?? offline(s, now);
  return { ...s, streak: 0, away, lastSeen: now };
}

function persist(s: State) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, streak: 0, lastSeen: Date.now() }));
  } catch {
    /* Full or blocked storage: keep playing. */
  }
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Floater = { id: number; text: string; kind: 'perfect' | 'good' | 'off' | 'robot'; x: number };
type Tab = 'robots' | 'tree' | 'meet';

export default function WorkoutGame() {
  const [s, setS] = useState<State>(load);
  const sRef = useRef(s);
  const commit = useCallback((next: State, save = false) => {
    sRef.current = next;
    setS(next);
    if (save) persist(next);
  }, []);

  const [lowered, setLowered] = useState(false);
  const [stamp, setStamp] = useState<{ id: number; judge: Judge } | null>(null);
  const [shock, setShock] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [panel, setPanel] = useState<Tab | null>(null);
  const [fs, setFs] = useState(false);
  const [meet, setMeet] = useState<{ max: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [said, setSaid] = useState('');
  const [, tick] = useState(0);

  const t0 = useRef(performance.now());
  const lastBeat = useRef(-1);
  const busy = useRef(false);
  const buffered = useRef<number | null>(null);
  const repTimers = useRef<number[]>([]);
  const lastTap = useRef(-1e9);
  const nextPay = useRef(performance.now() + ROBOT_CYCLE_S * 1000);
  const recent = useRef<{ t: number; g: number }[]>([]);
  const ids = useRef(0);
  const gestured = useRef(false);
  const meetRef = useRef(false);
  meetRef.current = meet !== null;

  const root = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLElement>(null);
  const gym = useRef<HTMLDivElement>(null);
  const shake = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  const announce = useCallback((msg: string) => setSaid((p) => (p === msg ? `${msg} ` : msg)), []);

  const float = useCallback((text: string, kind: Floater['kind']) => {
    const id = ++ids.current;
    const x = kind === 'robot' ? 0 : Math.round((Math.random() - 0.5) * 40);
    setFloaters((f) => [...f.slice(-7), { id, text, kind, x }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1000);
  }, []);

  /* ---------- Reps ---------- */

  const doRep = useCallback(
    (t: number) => {
      const cur = sRef.current;
      const j = judgeTap(t, t0.current, lastBeat.current, cur);
      lastBeat.current = j.beat;
      const r = rep(cur, j.judge);
      commit(r.s);
      recent.current.push({ t: performance.now(), g: r.gain });

      const id = ++ids.current;
      setStamp({ id, judge: j.judge });
      float(`+${fmt(r.gain)}`, j.judge);
      if (j.judge === 'perfect') {
        setShock(id);
        if (!reduced()) shake.current?.animate([{ transform: 'none' }, { transform: 'translateY(2px)' }, { transform: 'none' }], { duration: 140 });
      }
      if (r.broke > 0 && pill.current) {
        pill.current.animate(
          reduced()
            ? [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }]
            : [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }],
          { duration: 260 },
        );
      }
      if (cur.sound) {
        if (j.judge === 'perfect') sfx.perfect(r.s.streak);
        else if (j.judge === 'good') sfx.good();
        else if (r.broke >= 5) sfx.broke();
        else sfx.off();
      }

      busy.current = true;
      setLowered(true);
      repTimers.current = [
        window.setTimeout(() => setLowered(false), REP_MS / 2),
        window.setTimeout(() => {
          busy.current = false;
          const b = buffered.current;
          buffered.current = null;
          if (b !== null && !meetRef.current) doRep(b);
        }, REP_MS),
      ];
    },
    [commit, float],
  );

  const onTap = (t: number) => {
    gestured.current = true;
    wake();
    if (meetRef.current || sRef.current.away) return;
    lastTap.current = performance.now();
    if (busy.current) {
      if (buffered.current === null) buffered.current = t;
      return;
    }
    doRep(t);
  };

  const onPointer = (e: PointerEvent) => {
    if (e.button !== 0) return;
    onTap(e.timeStamp);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) onTap(e.timeStamp);
  };

  /* ---------- The frame loop: approach ring, idle fade, robot payouts ---------- */

  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const ph = (((now - t0.current) % BEAT_MS) + BEAT_MS) % BEAT_MS / BEAT_MS;
      if (ring.current) {
        ring.current.style.transform = `scale(${1 + 1.25 * (1 - ph)})`;
        ring.current.style.opacity = String(Math.min(1, ph * 3.5));
      }
      root.current?.classList.toggle('is-idle', now - lastTap.current > 3000);

      if (!meetRef.current && now >= nextPay.current) {
        const cycles = Math.min(12, Math.floor((now - nextPay.current) / (ROBOT_CYCLE_S * 1000)) + 1);
        nextPay.current += cycles * ROBOT_CYCLE_S * 1000;
        const cur = sRef.current;
        if (robotCount(cur) > 0) {
          const g = robotPayout(cur) * cycles;
          commit({ ...cur, gains: cur.gains + g, runGains: cur.runGains + g });
          float(`+${fmt(g)}`, 'robot');
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const sec = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(sec);
    };
  }, [commit, float]);

  /* ---------- Saving and offline time ---------- */

  useEffect(() => {
    const save = () => persist(sRef.current);
    let hiddenAt = 0;
    const vis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        save();
        return;
      }
      /* Under a minute hidden, the robot loop catches up on its own (up to
         12 cycles). Longer, and the time is paid by the away card instead. */
      const cur = sRef.current;
      if (hiddenAt && !cur.away) {
        const away = offline({ ...cur, lastSeen: hiddenAt }, Date.now());
        if (away) {
          nextPay.current = performance.now() + ROBOT_CYCLE_S * 1000;
          commit({ ...cur, away }, true);
        }
      }
    };
    const every = window.setInterval(save, 5000);
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', save);
    gym.current?.focus({ preventScroll: true });
    /* Show the sprites without a flash when the body or plates change. */
    Object.values(art).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    return () => {
      save();
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', save);
    };
  }, [commit]);

  /* Leaving the page: drop pending rep timers and free the audio context. */
  useEffect(
    () => () => {
      repTimers.current.forEach((id) => window.clearTimeout(id));
      shutdown();
    },
    [],
  );

  /* ---------- Music: locked to the beat clock, after a gesture ---------- */

  const musicOn = s.music;
  useEffect(() => {
    if (!musicOn) return;
    const start = () => music.start(t0.current, () => sRef.current.streak);
    if (gestured.current) start();
    else {
      const first = () => {
        gestured.current = true;
        start();
      };
      window.addEventListener('pointerdown', first, { once: true });
      window.addEventListener('keydown', first, { once: true });
      return () => {
        window.removeEventListener('pointerdown', first);
        window.removeEventListener('keydown', first);
        music.stop();
      };
    }
    return () => music.stop();
  }, [musicOn]);

  /* ---------- Buying ---------- */

  const buy = (next: State | null, msg: string) => {
    if (!next) return;
    commit(next, true);
    if (next.sound) sfx.buy();
    announce(msg);
  };

  const buyTreeNode = (id: NodeId) => {
    const cur = sRef.current;
    const n = treeNode(id);
    const gear = n.kind === 'gear' || n.kind === 'repeat';
    const msg = gear
      ? `Bought ${nodeName(cur, id)}. Reps now worth ${fmt(repBase(cur) + equipBonus(cur.equip))} base.`
      : `Learned ${nodeName(cur, id)}.`;
    buy(buyNode(cur, id), msg);
  };

  const closeTree = () => {
    setPanel(null);
    window.setTimeout(() => gym.current?.focus({ preventScroll: true }), 0);
  };

  const buyFirstRobot = () => buy(buyRobot(sRef.current, 0), 'Bought a Robo-Helper. You have 1.');

  const collect = () => {
    const cur = sRef.current;
    if (!cur.away) return;
    const g = cur.away.gains;
    commit({ ...cur, gains: cur.gains + g, runGains: cur.runGains + g, away: null }, true);
    nextPay.current = performance.now() + ROBOT_CYCLE_S * 1000;
    announce(`Collected ${fmt(g)} Gains.`);
    gym.current?.focus({ preventScroll: true });
  };

  const finishMeet = (res: MeetResult) => {
    const next = newRun(sRef.current, res);
    commit(next, true);
    setMeet(null);
    setPanel(null);
    lastBeat.current = -1;
    nextPay.current = performance.now() + ROBOT_CYCLE_S * 1000;
    announce(`New run. ${next.medals} medals: +${Math.round((medalMult(next) - 1) * 100)}% to all Gains.`);
    window.setTimeout(() => gym.current?.focus({ preventScroll: true }), 0);
  };

  const enterMeet = () => {
    if (!meetOpen(sRef.current)) return;
    buffered.current = null;
    setMeet({ max: maxLb(sRef.current) });
    announce(`Entered the ${meetName(sRef.current.meet)}.`);
  };

  const resetSave = () => {
    const keep = sRef.current;
    commit({ ...fresh(), sound: keep.sound, music: keep.music }, true);
    setConfirmReset(false);
    setMeet(null);
    setPanel(null);
    announce('Save erased. Starting fresh.');
  };

  /* ---------- Full screen ---------- */

  useEffect(() => {
    const on = () => setFs(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const canFs = typeof document !== 'undefined' && document.fullscreenEnabled;
  const toggleFs = () => {
    const stage = root.current?.closest<HTMLElement>('.game-stage') ?? root.current;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void stage?.requestFullscreen().catch(() => {});
  };

  /* The shop tiles sit under the score panel, whose height changes. */
  useEffect(() => {
    const el = scoreRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => root.current?.style.setProperty('--score-h', `${el.offsetHeight + 12}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* On narrow stages the shop sheet would hide the first robot: close it once. */
  const hadRobots = useRef(robotCount(s) > 0);
  useEffect(() => {
    const has = robotCount(s) > 0;
    if (has && !hadRobots.current && (root.current?.clientWidth ?? 1000) < 700) setPanel(null);
    hadRobots.current = has;
  }, [s]);

  /* Escape closes an open shop panel. */
  useEffect(() => {
    if (!panel) return;
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPanel(null);
      /* Focus was inside the closed panel: hand it back to the lifter. */
      if (!document.activeElement || document.activeElement === document.body || root.current?.querySelector('.wk-tree, .wk-flyout')?.contains(document.activeElement))
        window.setTimeout(() => gym.current?.focus({ preventScroll: true }), 0);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [panel]);

  /* ---------- Derived numbers ---------- */

  const now = performance.now();
  recent.current = recent.current.filter((r) => now - r.t < 5000);
  const tapRate = recent.current.reduce((a, r) => a + r.g, 0) / 5;
  const perSec = tapRate + robotRate(s);
  const req = meetReq(s.meet);
  const open = meetOpen(s);
  const progress = Math.min(1, s.runGains / req);
  const bonus = streakBonus(s);
  const capBonus = streakCap(s) * 0.1;
  const robotsShown = Math.min(8, robotCount(s));

  const ready = treeReady(s);
  const nextCost = TREE.filter((n) => n.kind !== 'root' && nodeCost(s, n.id) > s.gains).reduce((m, n) => Math.min(m, nodeCost(s, n.id)), Infinity);
  const canRobot = ROBOTS.some((_, t) => robotVisible(s, t) && s.gains >= robotCost(t, s.robots[t]));

  const tiles: { id: Tab; label: string; sub: string; dot: boolean; icon: ReactNode }[] = [
    {
      id: 'robots',
      label: 'Robots',
      sub: robotCount(s) ? `${robotCount(s)} · +${fmtRate(robotRate(s))}/s` : `First one ${robotCost(0, 0)}`,
      dot: canRobot,
      icon: <img src={sprite(s.robots[0] >= MODEL_S_AT ? 'srobot-1' : 'robot-1')} alt="" draggable={false} />,
    },
    {
      id: 'tree',
      label: 'Skill Tree',
      sub: ready > 0 ? `${ready} ready` : Number.isFinite(nextCost) ? `Next at ${fmt(nextCost)}` : 'All learned',
      dot: ready > 0,
      icon: (
        <svg className="wk-tree-icon" viewBox="-12 -12 24 24" width="40" height="40">
          <polygon points="5,0 2.5,4.33 -2.5,4.33 -5,0 -2.5,-4.33 2.5,-4.33" transform="translate(0 -4.4)" />
          <polygon points="5,0 2.5,4.33 -2.5,4.33 -5,0 -2.5,-4.33 2.5,-4.33" transform="translate(-7.5 4.4)" />
          <polygon points="5,0 2.5,4.33 -2.5,4.33 -5,0 -2.5,-4.33 2.5,-4.33" transform="translate(7.5 4.4)" />
        </svg>
      ),
    },
    {
      id: 'meet',
      label: 'Meet',
      sub: open ? 'Ready to enter' : `${Math.floor(progress * 100)}% there`,
      dot: open,
      icon: <span className="wk-medal">{s.medals}</span>,
    },
  ];
  const TITLES: Record<Tab, string> = { robots: 'Robots', tree: 'Skill Tree', meet: meetName(s.meet) };

  const onRootKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('button, a, input, [role="dialog"]') && t !== gym.current) return;
    onKey(e);
  };

  return (
    <div ref={root} className={`wk-root${panel ? ' has-panel' : ''}${fs ? ' is-fs' : ''}`} onKeyDown={onRootKey}>
      {/* The scene: the whole stage is the tap target. UI sits above it. */}
      <div className="wk-scene" onPointerDown={onPointer}>
        <GymBackdrop />
        <GymTV unlocked={tapesUnlocked(s)} interactive={s.reps > 0} paused={meet !== null} />
        <div
          ref={gym}
          className="wk-lifter"
          tabIndex={0}
          role="button"
          aria-label="Lift. Press Space or Enter on the beat, when the shrinking ring meets the gold ring."
        >
          <div className="wk-shake" ref={shake}>
            <img src={lifterSrc(s, 1)} alt="" className={lowered ? '' : 'is-on'} draggable={false} />
            <img src={lifterSrc(s, 2)} alt="" className={lowered ? 'is-on' : ''} draggable={false} />
            <div className="wk-target" aria-hidden="true">
              <div className="wk-approach" ref={ring} />
              {shock > 0 && <div key={shock} className="wk-shock" />}
            </div>
            {stamp && stamp.judge !== 'off' && (
              <span key={stamp.id} className={`wk-stamp is-${stamp.judge}`} aria-hidden="true">
                {stamp.judge === 'perfect' ? 'PERFECT' : 'Good'}
              </span>
            )}
            <div className="wk-floats" aria-hidden="true">
              {floaters
                .filter((f) => f.kind !== 'robot')
                .map((f) => (
                  <span key={f.id} className={`wk-float is-${f.kind}`} style={{ ['--x' as string]: `${f.x}px` }}>
                    {f.text}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div className={`wk-robots${robotsShown === 0 ? ' is-ghost' : ''}`} aria-hidden={robotsShown === 0 ? undefined : true}>
          {robotsShown === 0 ? (
            <button
              type="button"
              className={`wk-ghost${s.gains >= robotCost(0, 0) ? ' is-ready' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={() => (s.gains >= robotCost(0, 0) ? buyFirstRobot() : setPanel('robots'))}
            >
              <span className="wk-robot">
                <img src={robotSrc(s, 1)} alt="" draggable={false} />
              </span>
              <span className="wk-ghost-pill">Robo-Helper · {robotCost(0, 0)} Gains</span>
            </button>
          ) : (
            Array.from({ length: robotsShown }, (_, i) => (
              <span key={i} className="wk-robot">
                <img src={robotSrc(s, 1)} alt="" draggable={false} />
                <img src={robotSrc(s, 2)} alt="" draggable={false} style={{ animationDelay: `${-i * 0.62}s` }} />
              </span>
            ))
          )}
          {robotCount(s) > 8 && <span className="wk-more">+{robotCount(s) - 8}</span>}
          {floaters
            .filter((f) => f.kind === 'robot')
            .map((f) => (
              <span key={f.id} className="wk-float is-robot">
                {f.text}
              </span>
            ))}
        </div>
        {s.reps === 0 && <p className="wk-hint">Tap anywhere when the shrinking ring meets the gold one</p>}
      </div>

      {/* Score, top left */}
      <section className="wk-score" aria-label="Score" ref={scoreRef}>
        <div className="wk-score-head">
          <span className="wk-label">Gains</span>
          <span className="wk-big-num">{fmt(s.gains)}</span>
        </div>
        <div className="wk-score-stats">
          <span>
            <b>+{fmtRate(perSec)}</b>/s
          </span>
          <span>
            1RM <b>{maxLb(s)} lb</b>
          </span>
          <span>
            Medals <b>{s.medals}</b>
          </span>
        </div>
        <span
          ref={pill}
          className={`wk-streak${s.streak > 0 ? ' is-on' : ''}`}
          style={{ ['--glow' as string]: String(Math.min(1, bonus / capBonus)) }}
        >
          Streak {s.streak} · +{Math.round(bonus * 100)}%
        </span>
        <div className="wk-progress">
          <div className="wk-progress-text">
            <strong>{meetName(s.meet)}</strong>
            <span>{open ? 'is open' : `${fmt(s.runGains)} / ${fmt(req)}`}</span>
          </div>
          <div className="wk-bar" role="progressbar" aria-label={`Progress to the ${meetName(s.meet)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          {open && !meet && (
            <button type="button" className="btn btn-solid wk-enter" onClick={enterMeet}>
              Enter the meet
            </button>
          )}
        </div>
      </section>

      {/* Shop tiles down the left (a bottom bar on phones) */}
      <nav className="wk-tiles" aria-label="Shop">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`wk-tile${panel === t.id ? ' is-open' : ''}${t.dot ? ' is-ready' : ''}`}
            aria-expanded={panel === t.id}
            aria-controls={t.id === 'tree' ? 'wk-tree' : 'wk-flyout'}
            onClick={() => setPanel((p) => (p === t.id ? null : t.id))}
          >
            <span className="wk-tile-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="wk-tile-text">
              <span className="wk-tile-label">{t.label}</span>
              <span className="wk-tile-sub">{t.sub}</span>
            </span>
            {t.dot && <span className="wk-dot" aria-label={t.id === 'meet' ? ' (open)' : ' (can buy)'} />}
          </button>
        ))}
      </nav>

      {panel && panel !== 'tree' && (
        <section className="wk-flyout" id="wk-flyout" aria-label={TITLES[panel]}>
          <header className="wk-flyout-head">
            <h2>{TITLES[panel]}</h2>
            <button type="button" className="wk-close" aria-label="Close" onClick={() => setPanel(null)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </header>
          <div className="wk-panel">
            {meet && <p className="wk-panel-lead wk-closed">The shop is closed during the meet. Everything here resets after it, except medals and perks.</p>}
            {!meet && panel === 'robots' && (
              <>
                <p className="wk-panel-lead">
                  Robots lift every {ROBOT_CYCLE_S} s, even while you're away (at half speed, up to {offlineCapS(s) / 3600} h). Now: <strong>{fmtRate(robotRate(s))}/s</strong>.
                </p>
                {ROBOTS.map((r, t) =>
                  robotVisible(s, t) ? (
                    <Card
                      key={r.name}
                      icon={<img className="wk-card-robot" src={sprite(t === 0 && s.robots[0] >= MODEL_S_AT ? 'srobot-1' : 'robot-1')} alt="" />}
                      name={t === 0 && s.robots[0] >= MODEL_S_AT ? 'Robo-Helper Model S' : r.name}
                      owned={s.robots[t]}
                      effect={`+${fmt(Math.max(1, Math.round(r.out * medalMult(s))))} every ${ROBOT_CYCLE_S} s each${t === 0 && s.robots[0] < MODEL_S_AT ? ` · Model S at ${MODEL_S_AT}` : ''}`}
                      cost={robotCost(t, s.robots[t])}
                      gains={s.gains}
                      onBuy={() => buy(buyRobot(sRef.current, t), `Bought a ${r.name}. You have ${sRef.current.robots[t] + 1}.`)}
                    />
                  ) : null,
                )}
              </>
            )}

            {!meet && panel === 'meet' && (
              <div className="wk-meet-tab">
                <p className="wk-panel-lead">
                  Opens at <strong>{fmt(req)}</strong> Gains this run. Three attempts on the platform: stop the needle in the green.
                </p>
                <dl className="wk-facts">
                  <div>
                    <dt>Your max</dt>
                    <dd>{maxLb(s)} lb</dd>
                  </div>
                  <div>
                    <dt>Medals</dt>
                    <dd>
                      {s.medals} · +{Math.round((medalMult(s) - 1) * 100)}%
                    </dd>
                  </div>
                  {s.bestLift > 0 && (
                    <div>
                      <dt>Best meet lift</dt>
                      <dd>{s.bestLift} lb</dd>
                    </div>
                  )}
                </dl>
                <p className="wk-meet-note">
                  Entering ends this run: Gains, equipment, robots and technique reset. Medals stay, and each adds +10% to all Gains. Placing at the first meets unlocks perks.
                </p>
                {s.perks.length > 0 && (
                  <ul className="wk-owned">
                    {s.perks.map((p) => (
                      <li key={p}>{PERKS[p]}</li>
                    ))}
                  </ul>
                )}
                <button type="button" className="btn btn-solid wk-big" disabled={!open} onClick={enterMeet}>
                  {open ? `Enter the ${meetName(s.meet)}` : `${fmt(Math.max(0, req - s.runGains))} Gains to go`}
                </button>
                <div className="wk-settings">
                  {confirmReset ? (
                    <>
                      <span>Erase all progress, medals included?</span>
                      <button type="button" className="btn wk-danger" onClick={resetSave}>
                        Erase
                      </button>
                      <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-quiet" onClick={() => setConfirmReset(true)}>
                      Reset save
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {panel === 'tree' && !meet && <SkillTree s={s} lifter={lifterSrc(s, 1)} onBuy={buyTreeNode} onClose={closeTree} />}

      {/* Sound, bottom right (top right on phones) */}
      <div className="wk-controls">
        <Toggle on={s.music} label="Music" onClick={() => commit({ ...s, music: !s.music }, true)}>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </Toggle>
        <Toggle on={s.sound} label="Sound effects" onClick={() => commit({ ...s, sound: !s.sound }, true)}>
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          {s.sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m16 9 6 6m0-6-6 6" />}
        </Toggle>
        {canFs && (
          <Toggle on={fs} label="Full screen" onClick={toggleFs}>
            {fs ? <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /> : <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />}
          </Toggle>
        )}
      </div>

      {meet && (
        <div className="wk-overlay">
          <div className="wk-overlay-card" role="dialog" aria-modal="true" aria-label={`${meetName(s.meet)}`}>
            <Meet
              s={s}
              max={meet.max}
              lifter={lifterSrc(s, 1)}
              onDone={finishMeet}
              onLock={() => commit({ ...sRef.current, inMeet: true }, true)}
              onCancel={() => {
                setMeet(null);
                window.setTimeout(() => gym.current?.focus({ preventScroll: true }), 0);
              }}
              announce={announce}
            />
          </div>
        </div>
      )}

      {s.away && !meet && (
        <div className="wk-overlay">
          <div className="wk-away" role="dialog" aria-modal="true" aria-label="While you were away">
            <p className="wk-meet-kicker">While you were away</p>
            <p className="wk-away-gains">+{fmt(s.away.gains)} Gains</p>
            <p className="wk-meet-note">
              {fmtTime(s.away.seconds)} · your robots did {fmt(s.away.reps)} reps at half speed
              {s.away.seconds >= offlineCapS(s) ? ` (capped at ${offlineCapS(s) / 3600} h)` : ''}.
            </p>
            <button type="button" className="btn btn-solid wk-big" onClick={collect} autoFocus>
              Collect
            </button>
          </div>
        </div>
      )}

      <p className="visually-hidden" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

function Toggle({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`wk-toggle${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={label} title={`${label} ${on ? 'on' : 'off'}`} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function Card({
  icon,
  name,
  effect,
  cost,
  gains,
  owned,
  onBuy,
}: {
  icon: ReactNode;
  name: string;
  effect: string;
  cost: number;
  gains: number;
  owned?: number;
  onBuy: () => void;
}) {
  const can = gains >= cost;
  return (
    <button
      type="button"
      className={`wk-card${can ? ' is-ready' : ''}`}
      aria-disabled={!can}
      onClick={() => can && onBuy()}
      style={{ ['--fill' as string]: `${Math.min(1, gains / cost) * 100}%` }}
    >
      <span className="wk-card-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="wk-card-body">
        <span className="wk-card-name">
          {name}
          {owned ? <span className="wk-card-owned"> ×{owned}</span> : null}
          <span className="visually-hidden">,</span>
        </span>
        <span className="wk-card-effect">
          {effect}
          <span className="visually-hidden">,</span>
        </span>
      </span>
      <span className="wk-card-cost">
        {fmt(cost)} <small>Gains</small>
      </span>
    </button>
  );
}
