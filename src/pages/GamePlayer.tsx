import { Fragment, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gameBySlug } from '../data/games';
import type { Game } from '../data/games';
import { gameComponents } from '../games/registry';
import { useAudio } from '../context/AudioContext';
import { GameArt, gameStatus } from './Games';
import { NotFound } from './NotFound';

/* A phone or tablet with no mouse. A laptop with a touchscreen still has a
   fine pointer, so it keeps the game. */
const touchOnly = () =>
  window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;

/** The site's music (the easter-egg player) would play over the game's own
    sound, so it goes quiet while a game runs and comes back after. */
function useQuietSiteMusic(active: boolean) {
  const { started, muted, toggleMute } = useAudio();
  const silenced = useRef(false);
  const toggle = useRef(toggleMute);
  const isMuted = useRef(muted);
  toggle.current = toggleMute;
  isMuted.current = muted;

  /* Muted once, when the game starts. If the visitor turns the music back on
     during the game, that's their call, so this doesn't fight it. */
  useEffect(() => {
    if (!active || !started || isMuted.current || silenced.current) return;
    silenced.current = true;
    toggle.current();
  }, [active, started]);

  useEffect(
    () => () => {
      if (silenced.current && isMuted.current) toggle.current();
    },
    [],
  );
}

/** A React game fills the window under the nav, edge to edge. The stage
    measures the scrollbar and the nav so the bleed matches the visible width
    (as the nav's own bleed does), then scrolls itself up under the nav. */
function useFullBleed(stage: RefObject<HTMLDivElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const el = stage.current;
    if (!active || !el) return;
    const measure = () => {
      const nav = document.querySelector<HTMLElement>('.tab-bar');
      el.style.setProperty('--sbw', `${window.innerWidth - document.documentElement.clientWidth}px`);
      el.style.setProperty('--nav-h', `${nav ? nav.offsetHeight : 0}px`);
    };
    measure();
    const nav = document.querySelector<HTMLElement>('.tab-bar');
    /* offsetTop, not the bounding box: the route's enter animation may still
       be translating the page. */
    let y = 0;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    window.scrollTo({ top: y - (nav ? nav.offsetHeight : 0), behavior: 'instant' });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [stage, active]);
}

function Stage({ game: g, onStart }: { game: Game; onStart?: () => void }) {
  const [running, setRunning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  useQuietSiteMusic(running);
  useFullBleed(stage, running && g.kind === 'react');

  if (g.status !== 'playable') {
    return (
      <div className="game-stage is-waiting">
        <GameArt game={g} />
        <p className="game-stage-note">Being revived. It will be playable here when it is done.</p>
      </div>
    );
  }

  if (g.desktopOnly && touchOnly()) {
    return (
      <div className="game-stage is-waiting">
        <GameArt game={g} />
        <p className="game-stage-note">This one needs a keyboard and mouse. Open it on a computer to play.</p>
      </div>
    );
  }

  /* Nothing loads until Play: a WebGL build is tens of megabytes. */
  if (!running) {
    return (
      <div className="game-stage is-waiting">
        <GameArt game={g} />
        <button
          type="button"
          className="btn btn-solid game-play"
          onClick={() => {
            setRunning(true);
            if (g.kind === 'react') onStart?.();
          }}
        >
          Play
        </button>
      </div>
    );
  }

  if (g.kind === 'webgl') {
    const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
    return (
      <>
        <div className="game-stage is-running" ref={stage}>
          <iframe
            src={`/game-builds/${g.slug}/index.html`}
            title={g.title}
            allow="fullscreen; autoplay; gamepad"
          />
        </div>
        {canFullscreen && (
          <button type="button" className="btn btn-quiet game-fullscreen" onClick={() => stage.current?.requestFullscreen()}>
            Full screen
          </button>
        )}
      </>
    );
  }

  const Component = gameComponents[g.slug];
  return (
    <div className="game-stage is-running is-react is-full" ref={stage}>
      <Suspense fallback={<p className="game-stage-note">Loading…</p>}>
        {Component ? <Component /> : <p className="game-stage-note">This game is missing.</p>}
      </Suspense>
    </div>
  );
}

export function GamePlayer() {
  const { slug } = useParams();
  const g = gameBySlug(slug);
  /* A React game, once started, takes the top of the page; the title and
     about text move below it. Keyed siblings, so React moves the stage
     instead of remounting it. */
  /* Tracked per slug, so going Back or Forward to another game resets it. */
  const [fullSlug, setFullSlug] = useState<string | null>(null);
  if (!g) return <NotFound />;
  const full = fullSlug === g.slug;

  const head = (
    <Fragment key="head">
      <Link to="/games" className="game-back">← All games</Link>
      <h1>{g.title}</h1>
      <p className="game-meta game-meta-page">
        <span>{g.engine} · {g.year}</span>
        <span className={g.status === 'playable' ? 'game-status is-playable' : 'game-status'}>
          {g.status === 'playable' ? 'Playable' : gameStatus(g)}
        </span>
      </p>
    </Fragment>
  );
  const stage = <Stage key={g.slug} game={g} onStart={() => setFullSlug(g.slug)} />;

  return (
    <>
      {full ? [stage, head] : [head, stage]}

      <div className="game-about">
        {g.about.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {g.controls && (
          <p className="game-controls">
            <span>Controls</span> {g.controls}
          </p>
        )}
      </div>
    </>
  );
}
