import { experience } from '../data/experience';
import { anchors } from '../data/anchors';
import { Reveal } from '../components/Reveal';
import { ExperienceDeck } from '../components/ExperienceDeck';
import { useDeckEligible } from '../hooks/useDeckEligible';

/* Owned here rather than duplicated into the deck: both renderings show the
   same title, the deck just pins it alongside the pile instead of leaving it in
   the page above. */
const heading = (
  <>
    <h1>Experience</h1>
    <p className="page-intro">
      Six years of research and engineering roles, most of them in defense, security, or clinical
      settings — newest first.
    </p>
  </>
);

export function Experience() {
  /* The timeline is the baseline: it is what narrow screens, touch, reduced
     motion and a failed script all get, and it is the version that has to stay
     readable. The deck is the upgrade for anyone with the room and the appetite
     for it. */
  const deck = useDeckEligible();

  if (deck) return <ExperienceDeck heading={heading} />;

  return (
    <>
      {heading}
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
