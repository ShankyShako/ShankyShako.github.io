import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { projects, research as researchItems } from '../data/projects';
import { anchors } from '../data/anchors';
import { Reveal } from '../components/Reveal';
import type { Project } from '../data/projects';

export function ProjectCard({ project, anchor }: { project: Project; anchor?: string }) {
  return (
    <div className="project-item" id={anchor}>
      <div className="project-head">
        {project.href ? (
          <a href={project.href} target="_blank" rel="noopener noreferrer">
            {project.title}
          </a>
        ) : (
          <span className="project-title">{project.title}</span>
        )}
        <span className="project-years">({project.years})</span>
      </div>
      <p>{project.blurb}</p>
      <div className="project-tags">
        {project.tags.map((t) => (
          <span key={t} className="tag tag-static">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Projects() {
  const [active, setActive] = useState<string | null>(null);
  const { hash } = useLocation();

  /* A deep link from the chat bot names one project. If a tag filter is still
     applied from earlier, that card may not be rendered at all — so an anchor
     clears the filter rather than silently landing on nothing. */
  useEffect(() => {
    if (hash) setActive(null);
  }, [hash]);

  const allTags = useMemo(
    () => [...new Set(projects.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b)),
    [],
  );

  const shown = useMemo(
    () => (active ? projects.filter((p) => p.tags.includes(active)) : projects),
    [active],
  );

  return (
    <>
      <h1>Projects</h1>

      <div className="tag-row">
        <button
          type="button"
          className={active === null ? 'tag active' : 'tag'}
          onClick={() => setActive(null)}
        >
          All ({projects.length})
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={active === tag ? 'tag active' : 'tag'}
            onClick={() => setActive(active === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="content-card">
        {shown.map((p) => (
          <ProjectCard key={p.title} project={p} anchor={anchors.projects.get(p.title)} />
        ))}
        {shown.length === 0 && <p className="empty-note">Nothing tagged that. Yet.</p>}
      </div>
    </>
  );
}

export function Research() {
  return (
    <>
      <h1>Research</h1>
      <Reveal>
        <div className="content-card">
          {researchItems.map((p) => (
            <ProjectCard key={p.title} project={p} anchor={anchors.research.get(p.title)} />
          ))}
        </div>
      </Reveal>
    </>
  );
}

