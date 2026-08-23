import { useMemo, useState } from 'react';
import { projects, research as researchItems } from '../data/projects';
import { Reveal } from '../components/Reveal';
import type { Project } from '../data/projects';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="project-item">
      <div className="project-head">
        <a href={project.href} target="_blank" rel="noopener noreferrer">
          {project.title}
        </a>
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
          <ProjectCard key={p.title} project={p} />
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
            <ProjectCard key={p.title} project={p} />
          ))}
        </div>
      </Reveal>
    </>
  );
}

