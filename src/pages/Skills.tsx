import { skills } from '../data/skills';
import { Reveal } from '../components/Reveal';

export function Skills() {
  return (
    <>
      <h1>Skills</h1>
      <p className="page-intro">
        Languages, frameworks, and the work I have actually used each of them for.
      </p>

      <div className="skills-grid">
        {skills.map((group, i) => (
          <Reveal key={group.title} delay={i * 50} className={group.wide ? 'is-wide' : ''}>
            <div className="skill-card">
              <h3>{group.title}</h3>
              {group.kind === 'prose' ? (
                <p>{group.items.join(' · ')}</p>
              ) : (
                <ul className="bullet-list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
