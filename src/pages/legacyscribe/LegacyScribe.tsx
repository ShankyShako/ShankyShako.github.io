import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '../../components/Reveal';
import { HeroDemo } from './HeroDemo';
import { ModesDemo } from './ModesDemo';
import { Compare } from './Compare';
import { CoachDemo } from './CoachDemo';
import { Numbers } from './Numbers';
import { PrivateDemo } from './PrivateDemo';
import { InstallBlock, DownloadBlock } from './InstallBlock';
import './legacyscribe.css';

const REPO = 'https://github.com/ShankyShako/LegacyScribe';

const MORE: [string, string][] = [
  ['Spoken instructions', '"Legacy, make this friendlier" rewrites the selection.'],
  ['Notes', 'Tap once, talk for up to 2 hours, get speaker labels, and trim a tangent out of the notes.'],
  ['Fits the sentence', 'Lowercases mid-sentence and fixes the spacing where your words land.'],
  ['Nothing lost', 'Esc has Undo for 30 s, and failed dictations are kept with a Retry button.'],
  ['Code talk', '"Slash review" reaches the assistant as /review.'],
  ['Read-aloud practice', '280 sentences covering all 39 English sounds.'],
];

const FAQ: [string, ReactNode][] = [
  [
    'Why does macOS block the download?',
    <>
      The app isn't signed with an Apple Developer ID yet, so it isn't notarized, and macOS blocks
      a browser download the first time. Open it once, then go to System Settings → Privacy &amp;
      Security → Open Anyway. The curl line downloads the same file without a browser, checks that
      it is signed by LegacyScribe's team, and skips that step.
    </>,
  ],
  [
    'What does it need?',
    <>
      An Apple Silicon Mac on macOS 26 or later. Cohere Transcribe is a 1.4 GB download and uses
      about 2 GB of memory while loaded; it is unloaded after each dictation. The recommended 4B
      rewrite model wants a 16 GB Mac; the 1.7B runs on 8 GB. Apple Speech and Parakeet use under
      100 MB of memory.
    </>,
  ],
  [
    'What is sent where?',
    <>
      Speech recognition, Notes and the Speech Coach always run on your Mac, and audio never leaves
      it. Text goes out only if you pick a cloud AI to rewrite with, using your own key, and then it
      goes to that provider. Models download from Hugging Face and update checks go to GitHub; Private
      mode blocks both. There is no account, analytics or crash reporting.{' '}
      <a href={`${REPO}/blob/main/PRIVACY.md`} target="_blank" rel="noopener noreferrer">
        Full list
      </a>
    </>,
  ],
  [
    'Who made it?',
    <>
      Genova Mongalo, who built it to dictate prompts to coding agents and notes all day. It started as a fork of Hex
      by Kit Langton and now has its own engines, rewrite modes, Notes and Speech Coach.
    </>,
  ],
];

export function LegacyScribe() {
  return (
    <div className="ls-page">
      <header className="ls-top">
        <div className="ls-top-in">
          <span className="ls-brand">
            <img src="/image/legacyscribe-icon.png" alt="" width="28" height="28" />
            LegacyScribe
          </span>
          <nav aria-label="Page">
            <a href="#compare">Compare</a>
            <a href="#privacy">Privacy</a>
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
          <Link className="ls-back" to="/projects">
            ← gmango.dev
          </Link>
        </div>
      </header>

      <main className="ls-main">
        <section className="ls-hero">
          <div className="ls-hero-copy">
            <h1>Talk, and it's typed. On your Mac.</h1>
            <p className="ls-sub">
              Hold <span className="ls-key">Right ⌥</span>, say it, let go. LegacyScribe writes what
              you meant into whatever app you're in, with the ums and false starts taken out. Speech
              recognition and the AI run on your Mac. Free and open source.
            </p>
            <div className="ls-install">
              <InstallBlock />
              <DownloadBlock />
            </div>
            <ul className="ls-facts">
              <li>Free, MIT licence</li>
              <li>Works offline</li>
              <li>No account</li>
            </ul>
          </div>
          <HeroDemo />
        </section>

        <section className="ls-section" aria-labelledby="ls-modes-h">
          <Reveal>
            <p className="ls-eyebrow">Three ways to paste</p>
            <h2 id="ls-modes-h">One dictation, three results.</h2>
          </Reveal>
          <ModesDemo />
          <p className="ls-lead ls-after">
            Switch with <span className="ls-key">⌃⌥</span>, like ⌘-Tab. Clean is the default.
          </p>
        </section>

        <Compare />

        <section className="ls-section" id="coach" aria-labelledby="ls-coach-h">
          <Reveal>
            <p className="ls-eyebrow">The better part</p>
            <h2 id="ls-coach-h">Hear your own habits.</h2>
            <p className="ls-lead">
              Off by default. It listens to your own History recordings on your Mac and counts
              fillers, crutch words, hedges, restarts, pace and pauses, with clips of you saying
              them next to a clean sentence of yours.
            </p>
          </Reveal>
          <CoachDemo />
        </section>

        <Numbers />

        <section className="ls-section" id="privacy" aria-labelledby="ls-private-h">
          <Reveal>
            <h2 id="ls-private-h">Nothing leaves the Mac unless you say so.</h2>
          </Reveal>
          <div className="ls-private-grid">
            <PrivateDemo />
            <div className="ls-private-facts">
              <ul>
                <li>Speech recognition, Notes and the Speech Coach always run on your Mac.</li>
                <li>
                  Text goes out only if you choose a cloud AI, with your own key.
                </li>
                <li>No account, no analytics, no crash reporting.</li>
              </ul>
              <p>
                <a href={`${REPO}/blob/main/PRIVACY.md`} target="_blank" rel="noopener noreferrer">
                  Everything stored, read and sent: PRIVACY.md
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="ls-section" aria-labelledby="ls-more-h">
          <Reveal>
            <h2 id="ls-more-h">A few more things.</h2>
            <ul className="ls-more">
              {MORE.map(([t, d]) => (
                <li key={t}>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </main>

      <footer className="ls-get" id="get" aria-labelledby="ls-get-h">
        <div className="ls-get-in">
          <Reveal>
            <h2 id="ls-get-h">Get it.</h2>
            <InstallBlock />
            <DownloadBlock />
            <div className="ls-faq">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <p className="ls-credit">
              LegacyScribe is a fork of{' '}
              <a href="https://github.com/kitlangton/Hex" target="_blank" rel="noopener noreferrer">
                Hex
              </a>{' '}
              by Kit Langton (MIT). Built by Genova Mongalo; entered in UMKC Hack-A-Roo, 13 November
              2026.
            </p>
            <nav className="ls-links" aria-label="Links">
              <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href={`${REPO}/blob/main/PRIVACY.md`} target="_blank" rel="noopener noreferrer">Privacy</a>
              <a href={`${REPO}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">Changelog</a>
              <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">Report a problem</a>
              <Link to="/projects">← gmango.dev</Link>
            </nav>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}
