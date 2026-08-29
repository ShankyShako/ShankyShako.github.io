import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { projects, research as researchItems } from '../data/projects';
import { anchors } from '../data/anchors';
import { Reveal } from '../components/Reveal';
import type { Project } from '../data/projects';

export function ProjectCard({ project, anchor }: { project: Project; anchor?: string }) {
  return (
    <article className="project-item" id={anchor}>
      <div className="project-head">
        {project.href ? (
          <a href={project.href} target="_blank" rel="noopener noreferrer">
            {project.title}
          </a>
        ) : (
          <span className="project-title">{project.title}</span>
        )}
        <span className="project-years">{project.years}</span>
      </div>
      <p>{project.blurb}</p>
      <div className="project-tags">
        {project.tags.map((t) => (
          <span key={t} className="tag tag-static">
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}

/* Twelve projects produce thirty tags, which as one flat row is four lines of
   chips above the fold — a filter that costs more attention than the list it
   filters. Ordered by how many projects carry them, the first dozen cover most
   of the collection in two lines; the rest stay one click away rather than
   gone, so every tag is still reachable. */
const VISIBLE_TAGS = 12;

export function Projects() {
  const [active, setActive] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { hash } = useLocation();

  /* A deep link from the chat bot names one project. If a tag filter is still
     applied from earlier, that card may not be rendered at all — so an anchor
     clears the filter rather than silently landing on nothing. */
  useEffect(() => {
    if (hash) setActive(null);
  }, [hash]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of projects.flatMap((p) => p.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, []);

  /* The active tag always renders, even when it sits past the cut — collapsing
     the row must never hide the filter that is currently on. */
  const visibleTags = useMemo(
    () =>
      showAll
        ? allTags
        : [...new Set([...allTags.slice(0, VISIBLE_TAGS), ...(active ? [active] : [])])],
    [allTags, showAll, active],
  );

  const shown = useMemo(
    () => (active ? projects.filter((p) => p.tags.includes(active)) : projects),
    [active],
  );

  return (
    <>
      <h1>Projects</h1>
      <p className="page-intro">
        Coursework, side builds, and collaborations. Filter by what they are made of.
      </p>

      <div className="tag-row">
        <button
          type="button"
          className={active === null ? 'tag active' : 'tag'}
          onClick={() => setActive(null)}
        >
          All ({projects.length})
        </button>
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={active === tag ? 'tag active' : 'tag'}
            onClick={() => setActive(active === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
        {allTags.length > VISIBLE_TAGS && (
          <button type="button" className="tag tag-more" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `+${allTags.length - VISIBLE_TAGS} more`}
          </button>
        )}
      </div>

      <div className="project-grid">
        {shown.map((p) => (
          <ProjectCard key={p.title} project={p} anchor={anchors.projects.get(p.title)} />
        ))}
      </div>
      {shown.length === 0 && <p className="empty-note">Nothing tagged that. Yet.</p>}
    </>
  );
}

export function Research() {
  return (
    <>
      <h1>Research</h1>
      <p className="page-intro">
        Peer-reviewed and publication-track work, with the code behind it.
      </p>

      <Reveal>
        <div className="project-grid">
          {researchItems.map((p) => (
            <ProjectCard key={p.title} project={p} anchor={anchors.research.get(p.title)} />
          ))}
        </div>
      </Reveal>
    </>
  );
}
