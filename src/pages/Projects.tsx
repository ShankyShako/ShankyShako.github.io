import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { projects, research as researchItems } from '../data/projects';
import { publications, cite } from '../data/publications';
import { anchors } from '../data/anchors';
import { firstSentence, leadSentences } from '../lib/firstSentence';
import { Reveal } from '../components/Reveal';
import { Featured } from '../components/Featured';
import { IndexList, IndexRow } from '../components/IndexRow';
import type { Project } from '../data/projects';
import type { Publication } from '../data/publications';

/* A repo link says GitHub; anything else a project links to is the live thing. */
function linkLabel(href: string) {
  return new URL(href).hostname === 'github.com' ? 'GitHub' : 'Live site';
}

function ProjectLinks({ project }: { project: Project }) {
  if (!project.href && !project.page) return null;
  return (
    <div className="links">
      {project.href && (
        <a href={project.href} target="_blank" rel="noopener noreferrer">
          {linkLabel(project.href)}
        </a>
      )}
      {project.page && <Link to={project.page}>Product page →</Link>}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="tags">
      {tags.map((t) => (
        <span key={t} className="tag tag-static">
          {t}
        </span>
      ))}
    </div>
  );
}

/* Featured, not the whole write-up: two sentences, then the rest in place.
   A deep link to the card opens it. */
function FeatBlurb({ text, anchor }: { text: string; anchor?: string }) {
  const { hash } = useLocation();
  const targeted = !!anchor && hash === `#${anchor}`;
  const [open, setOpen] = useState(targeted);
  const lead = leadSentences(text, 2);
  useEffect(() => {
    if (targeted) setOpen(true);
  }, [targeted]);
  return (
    <>
      <p className="feat-blurb">{open ? text : lead}</p>
      {lead !== text && (
        <button type="button" className="feat-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Less' : 'More'}
        </button>
      )}
    </>
  );
}

function ProjectFeatured({
  project,
  anchor,
  large,
  as,
}: {
  project: Project;
  anchor?: string;
  large?: boolean;
  as: 'h2' | 'h3';
}) {
  return (
    <Featured as={as} id={anchor} title={project.title} meta={project.years} large={large}>
      <FeatBlurb text={project.blurb} anchor={anchor} />
      <ProjectLinks project={project} />
      <Tags tags={project.tags} />
    </Featured>
  );
}

function ProjectRow({ project, anchor }: { project: Project; anchor?: string }) {
  return (
    <IndexRow
      id={anchor}
      title={project.title}
      meta={project.years}
      summary={firstSentence(project.blurb)}
    >
      <p className="idx-blurb">{project.blurb}</p>
      <ProjectLinks project={project} />
      <Tags tags={project.tags} />
    </IndexRow>
  );
}

/* A paper is a citation before it is a description, so the card leads with the
   author line and the venue — the two things a reader checks first — and only
   then explains what the work does. The name is bolded in place rather than
   pulled out: the position in the author list is the information. */
function PublicationFeatured({ pub, anchor }: { pub: Publication; anchor?: string }) {
  const [copied, setCopied] = useState(false);

  /* A copy button that changes nothing on screen leaves you pressing it twice
     to find out whether the first press worked. */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cite(pub));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard denied or unavailable — the citation is still readable in
         the card above, so there is nothing useful to say about it. */
    }
  };

  return (
    <Featured as="h3" id={anchor} title={pub.title} meta={pub.status === 'accepted' ? `${pub.year} · Accepted` : pub.year}>
      <p className="pub-authors">
        {pub.authors.map((a, i) => (
          <span key={a}>
            {i > 0 && ', '}
            {a === 'Genova Mongalo' ? <strong>{a}</strong> : a}
          </span>
        ))}
      </p>
      <p className="pub-venue">
        {pub.venue}, {pub.where}
      </p>
      {pub.history && <p className="pub-venue">{pub.history}</p>}

      <FeatBlurb text={pub.blurb} anchor={anchor} />

      <div className="links">
        {pub.doi && (
          <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer">
            DOI
          </a>
        )}
        {pub.preprint && (
          <a href={pub.preprint} target="_blank" rel="noopener noreferrer">
            Preprint (arXiv)
          </a>
        )}
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy citation'}
        </button>
      </div>

      <Tags tags={pub.tags} />
    </Featured>
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
     applied from earlier, that row may not be rendered at all — so an anchor
     clears the filter rather than silently landing on nothing. */
  useEffect(() => {
    if (hash) setActive(null);
  }, [hash]);

  const featured = useMemo(() => projects.filter((p) => p.featured), []);
  const indexed = useMemo(() => projects.filter((p) => !p.featured), []);

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

  /* With a tag on, the index lists every match, featured ones included, so the
     list is honest about the filter and the featured block above never moves. */
  const shown = useMemo(
    () => (active ? projects.filter((p) => p.tags.includes(active)) : indexed),
    [active, indexed],
  );

  return (
    <div className="fx">
      <h1>Projects</h1>
      <p className="page-intro">
        Coursework, side projects, and things I built for other people. Click a tag to filter.
      </p>

      <Reveal>
        <div className="feat-grid">
          {featured.map((p, i) => (
            <ProjectFeatured
              key={p.title}
              project={p}
              anchor={anchors.projects.get(p.title)}
              large={i === 0}
              as="h2"
            />
          ))}
        </div>
      </Reveal>

      <Reveal>
        <h2 className="fx-heading">All projects</h2>

        <div className="tag-row">
          <button
            type="button"
            className={active === null ? 'tag active' : 'tag'}
            onClick={() => setActive(null)}
          >
            All ({indexed.length})
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

        <IndexList>
          {shown.map((p) => (
            <ProjectRow
              key={p.title}
              project={p}
              anchor={p.featured ? undefined : anchors.projects.get(p.title)}
            />
          ))}
        </IndexList>
        {shown.length === 0 && <p className="empty-note">Nothing tagged that. Yet.</p>}
      </Reveal>
    </div>
  );
}

export function Research() {
  return (
    <div className="fx">
      <h1>Research</h1>
      <p className="page-intro">
        Published papers and research projects, with code where I'm allowed to share it.
      </p>

      <Reveal>
        <h2 className="fx-heading">Publications</h2>
        <div className="feat-grid">
          {publications.map((p) => (
            <PublicationFeatured key={p.title} pub={p} anchor={anchors.publications.get(p.title)} />
          ))}
        </div>
      </Reveal>

      <Reveal>
        <h2 className="fx-heading">Research projects</h2>
        <IndexList>
          {researchItems.map((p) => (
            <ProjectRow key={p.title} project={p} anchor={anchors.research.get(p.title)} />
          ))}
        </IndexList>
      </Reveal>
    </div>
  );
}
