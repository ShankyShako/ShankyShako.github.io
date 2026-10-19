import { Reveal } from '../../components/Reveal';

const BARS = [
  { name: 'Cohere Transcribe', wer: 5.3, lead: true },
  { name: 'Parakeet v3', wer: 8.8, lead: false },
  { name: 'Apple Speech', wer: 8.8, lead: false },
];
const AXIS_MAX = 10;

const BENCH = 'https://github.com/ShankyShako/LegacyScribe/blob/main/docs/bench-results.md';

export function Numbers() {
  return (
    <section className="ls-section" id="numbers" aria-labelledby="ls-numbers-h">
      <Reveal>
        <h2 id="ls-numbers-h">Measured on my voice, on an M5.</h2>
        <div className="ls-numbers">
          <figure className="ls-bars">
            <figcaption>Word error rate, 20 clips. Lower is better.</figcaption>
            <ul>
              {BARS.map((b) => (
                <li key={b.name}>
                  <span className="ls-bar-name">{b.name}</span>
                  <span className="ls-bar-track" aria-hidden="true">
                    <span
                      className={b.lead ? 'ls-bar-fill ls-bar-lead' : 'ls-bar-fill'}
                      style={{ width: `${(b.wer / AXIS_MAX) * 100}%` }}
                    />
                  </span>
                  <span className="ls-bar-val">{b.wer} %</span>
                </li>
              ))}
            </ul>
          </figure>
          <ul className="ls-facts-list">
            <li>
              <b>Cohere Transcribe</b> turns 10 seconds of audio into text in about 320 ms.
            </li>
            <li>
              <b>Parakeet v3</b>, the default, takes about 73 ms for the same 10 seconds.
            </li>
            <li>
              <b>The on-device rewrite</b> (Qwen3 4B, 4-bit) takes 0.4–1.5 s for a dictation of up
              to 55 words, and 2.9 s for 107.
            </li>
            <li>
              <b>The live caption</b> shows its first word a median 0.74 s after you start speaking
              (5 clips, in-app test).
            </li>
          </ul>
        </div>
        <p className="ls-source">
          20 of my own clips, 3 warm runs. Method and every table:{' '}
          <a href={BENCH} target="_blank" rel="noopener noreferrer">
            docs/bench-results.md
          </a>
        </p>
      </Reveal>
    </section>
  );
}
