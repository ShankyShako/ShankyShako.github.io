import { Suspense, useEffect, useRef, useState } from 'react';
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

function Stage({ game: g }: { game: Game }) {
  const [running, setRunning] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  useQuietSiteMusic(running);

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
        <button type="button" className="btn btn-solid game-play" onClick={() => setRunning(true)}>
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
    <div className="game-stage is-running is-react">
      <Suspense fallback={<p className="game-stage-note">Loading…</p>}>
        {Component ? <Component /> : <p className="game-stage-note">This game is missing.</p>}
      </Suspense>
    </div>
  );
}

export function GamePlayer() {
  const { slug } = useParams();
  const g = gameBySlug(slug);
  if (!g) return <NotFound />;

  return (
    <>
      <Link to="/games" className="game-back">← All games</Link>
      <h1>{g.title}</h1>
      <p className="game-meta game-meta-page">
        <span>{g.engine} · {g.year}</span>
        <span className={g.status === 'playable' ? 'game-status is-playable' : 'game-status'}>
          {g.status === 'playable' ? 'Playable' : gameStatus(g)}
        </span>
      </p>

      <Stage key={g.slug} game={g} />

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
