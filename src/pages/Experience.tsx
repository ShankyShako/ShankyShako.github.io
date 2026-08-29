import { experience } from '../data/experience';
import { anchors } from '../data/anchors';
import { Reveal } from '../components/Reveal';

export function Experience() {
  return (
    <>
      <h1>Experience</h1>
      <p className="page-intro">
        Six years of research and engineering roles, most of them in defense, security, or clinical
        settings — newest first.
      </p>

      <div className="timeline">
        {experience.map((role, i) => (
          <Reveal key={role.org} delay={i * 50}>
            <article className="experience-item" id={anchors.experience.get(role.org)}>
              <h3>
                {role.org} — <u>{role.title}</u>
              </h3>
              <span className="experience-date">{role.date}</span>
              <p>{role.blurb}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
