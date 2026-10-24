import { Link } from 'react-router-dom';
import { ProfilePhoto } from '../components/ProfilePhoto';

/* Three facts that back the headline up. They sit under the portrait, not
   under the copy, so they never compete with it. Deliberately local to this
   page rather than in src/data: bot/build-context.mjs mirrors src/data into
   the chat model's prompt, and these are a restatement of facts it already
   has from experience.ts — paying prompt tokens twice for the same claim buys
   nothing.

   `short` is the phone wording: there the three sit side by side in a third
   of the width each, where "classifier accuracy, AFRL" wraps to three lines.
   Only one of the two is displayed, so a screen reader reads one. */
const highlights = [
  { stat: '2 IEEE papers', label: '2024 and 2025', short: ['2 IEEE', 'papers'] },
  { stat: '+50 pts', label: 'classifier accuracy, AFRL', short: ['+50 pts', 'at AFRL'] },
  { stat: 'Summa cum laude', label: 'B.S., UMKC', short: ['Summa', 'cum laude'] },
];

export function Home() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>Genova Mongalo</h1>
        <p className="hero-statement">
          I build machine learning <span className="hero-statement-accent">into products people use.</span>
        </p>
        <p className="hero-line">
          Founding engineer at Geometry Health. Maker of LegacyScribe. M.S. at Georgia Tech.
        </p>

        <div className="hero-actions">
          <Link className="btn btn-solid" to="/resume">
            View résumé
          </Link>
          <Link className="btn" to="/contact">
            Get in touch
          </Link>
          <Link className="btn btn-quiet" to="/experience">
            Experience
          </Link>
        </div>
      </div>

      <div className="hero-portrait">
        <ProfilePhoto />
      </div>

      <ul className="hero-stats">
        {highlights.map((h) => (
          <li key={h.stat}>
            <strong className="long">{h.stat}</strong>
            <span className="long">{h.label}</span>
            <strong className="short">{h.short[0]}</strong>
            <span className="short">{h.short[1]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
