import { skills } from '../data/skills';
import { Reveal } from '../components/Reveal';
import { Featured } from '../components/Featured';

export function Skills() {
  const featured = skills.filter((g) => g.featured);
  const rest = skills.filter((g) => !g.featured);

  return (
    <div className="fx">
      <h1>Skills</h1>
      <p className="page-intro">
        What I write code in, and the tools I use to build, train, and ship it.
      </p>

      <Reveal>
        <div className="feat-grid">
          {featured.map((group) => (
            <Featured key={group.title} as="h2" title={group.title}>
              <ul className="bullet-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Featured>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <dl className="skill-rows">
          {rest.map((group) => (
            <div key={group.title}>
              <dt>{group.title}</dt>
              <dd>{group.items.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </div>
  );
}
