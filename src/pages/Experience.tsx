import { experience } from '../data/experience';
import { anchors } from '../data/anchors';
import { Reveal } from '../components/Reveal';

export function Experience() {
  return (
    <>
      <h1>Work Experience</h1>
      <div className="content-card">
        {experience.map((role, i) => (
          <Reveal key={role.org} delay={i * 60}>
            <div className="experience-item" id={anchors.experience.get(role.org)}>
              <h3>
                {role.org} — <u>{role.title}</u>
              </h3>
              <span className="experience-date">{role.date}</span>
              <p>{role.blurb}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
