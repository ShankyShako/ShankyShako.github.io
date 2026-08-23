import { skills } from '../data/skills';
import { Reveal } from '../components/Reveal';

export function Skills() {
  return (
    <>
      <h1>Skills</h1>
      <div className="skills-grid">
        {skills.map((group, i) => (
          <Reveal key={group.title} delay={i * 60}>
            <div className="skill-card">
              <h3>{group.title}</h3>
              {group.kind === 'prose' ? (
                <p>{group.items.join(', ')}</p>
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
