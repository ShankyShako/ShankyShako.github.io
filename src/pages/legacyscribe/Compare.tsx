import { Reveal } from '../../components/Reveal';

const ROWS: [string, string, string, string][] = [
  ['Price', 'Free', 'Free up to 2,000 words a week', 'Paid Pro plan'],
  ['Speech recognition', 'On your Mac', 'In the cloud', 'On your Mac or cloud'],
  ['AI clean-up', 'On your Mac, or your own key', 'In the cloud', 'Cloud or local'],
  ['Source code', 'Open (MIT)', 'Closed', 'Closed'],
  ['Meeting notes', 'Yes, with speaker labels', 'Notetaker', 'Meeting assistant'],
];

export function Compare() {
  return (
    <section className="ls-section" id="compare" aria-labelledby="ls-compare-h">
      <Reveal>
        <h2 id="ls-compare-h">
          We do it, <s className="ls-strike">but like</s> better.
        </h2>
        <p className="ls-lead">
          Wispr Flow and Superwhisper dictate too. The crutch word is struck out because
          LegacyScribe's Speech Coach would count it.
        </p>
        <div className="ls-tablewrap">
          <table className="ls-table">
            <caption className="ls-sr">LegacyScribe compared with Wispr Flow and Superwhisper</caption>
            <thead>
              <tr>
                <th scope="col"><span className="ls-sr">Feature</span></th>
                <th scope="col" className="ls-us">LegacyScribe</th>
                <th scope="col">Wispr Flow</th>
                <th scope="col">Superwhisper</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b, c]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td className="ls-us">{a}</td>
                  <td>{b}</td>
                  <td>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ls-source">From each app's website, 17 October 2026.</p>
      </Reveal>
    </section>
  );
}
