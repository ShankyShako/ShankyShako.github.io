import { Link } from 'react-router-dom';
import { ProfilePhoto } from '../components/ProfilePhoto';

/* Three numbers that a recruiter can read in two seconds. Deliberately local
   to this page rather than in src/data: bot/build-context.mjs mirrors
   src/data into the chat model's prompt, and these are a restatement of facts
   it already has from experience.ts — paying prompt tokens twice for the same
   claim buys nothing. */
const highlights = [
  { stat: '+50 pts', label: 'downstream classifier lift over baseline at AFRL' },
  { stat: '2 IEEE papers', label: 'TDSC journal 2025, and solo-author IEEE Big Data 2024' },
  { stat: 'summa cum laude', label: 'B.S. Computer Science, UMKC' },
];

export function Home() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">AI / ML Engineer</span>
        <h1>Genova Mongalo</h1>

        <p className="hero-lede">
          I'm an ML engineer, a year into an M.S. in Computer Science at Georgia Tech with an AI
          emphasis, after a B.S. from UMKC summa cum laude. I build generative models, transformers, and
          on-device ML, mostly for jobs where a wrong answer hurts someone: a ransomware infection
          nobody caught, a stroke patient's balance test read wrong.
        </p>
        <p className="hero-sub">
          Right now I'm the founding engineer at Geometry Health and Wellness, putting clinical
          mobility tests on an iPhone. Before that I was a federal contractor with the AFRL Sensors
          Directorate. My game-theoretic spin on GAN training there let a CNN trained only on
          generated images recognize real objects. Earlier I worked on ransomware detection,
          cybersickness prediction in VR, and signal propagation for a NASA-funded study.
        </p>

        <ul className="hero-stats">
          {highlights.map((h) => (
            <li key={h.stat}>
              <strong>{h.stat}</strong>
              <span>{h.label}</span>
            </li>
          ))}
        </ul>

        <div className="hero-actions">
          <Link className="btn btn-solid" to="/resume">
            View résumé
          </Link>
          <Link className="btn" to="/experience">
            Experience
          </Link>
          <Link className="btn btn-quiet" to="/contact">
            Get in touch
          </Link>
        </div>
      </div>

      <div className="hero-portrait">
        <ProfilePhoto />
      </div>
    </section>
  );
}
