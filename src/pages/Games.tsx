import { Link } from 'react-router-dom';
import { games } from '../data/games';
import type { Game } from '../data/games';
import { Reveal } from '../components/Reveal';

/** The card's art, or the title set large when a game has no art yet. */
export function GameArt({ game: g }: { game: Game }) {
  return (
    <div className="game-frame">
      {g.image ? (
        <img src={g.image} alt={g.alt ?? ''} onError={(e) => e.currentTarget.classList.add('img-missing')} />
      ) : (
        <span className="game-frame-title" aria-hidden="true">{g.title}</span>
      )}
    </div>
  );
}

export function gameStatus(g: Game) {
  return g.status === 'playable' ? 'Play' : 'Being revived';
}

export function Games() {
  return (
    <>
      <h1>Games</h1>
      <p className="page-intro">
        Games I made in Unity in 2021, rebuilt to play in the browser.
      </p>

      <div className="games-grid">
        {games.map((g, i) => (
          <Reveal key={g.slug} delay={i * 60}>
            <Link to={`/games/${g.slug}`} className="game-card">
              <GameArt game={g} />
              <div className="game-info">
                <span className="game-title">{g.title}</span>
                <span className="game-pitch">{g.pitch}</span>
                <span className="game-meta">
                  <span>{g.engine} · {g.year}</span>
                  <span className={g.status === 'playable' ? 'game-status is-playable' : 'game-status'}>
                    {gameStatus(g)}
                  </span>
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </>
  );
}
