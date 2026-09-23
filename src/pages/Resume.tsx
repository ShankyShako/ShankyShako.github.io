import { Reveal } from '../components/Reveal';
import { Personalizer } from '../components/resume/Personalizer';

const PDF = '/files/Resume.pdf';

export function Resume() {
  return (
    <>
      <h1>Résumé</h1>
      <Reveal>
        <div className="resume-actions">
          <a className="btn btn-solid" href={PDF} download="Genova-Mongalo-Resume.pdf">
            Download PDF
          </a>
          <a className="btn" href={PDF} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </div>
        <Personalizer original={PDF} />
      </Reveal>
    </>
  );
}
