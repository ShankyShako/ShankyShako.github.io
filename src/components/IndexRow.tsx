import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export function IndexList({ children }: { children: ReactNode }) {
  return <ul className="idx">{children}</ul>;
}

/* One compact row: title, years, summary. With children, the title is a
   button inside the heading (the accordion pattern: a heading may hold a
   button, a button may not hold a heading), stretched over the whole row so
   anywhere on it toggles; the full write-up opens in place. A chat-bot deep
   link (`#id`) opens its row on arrival and when the hash changes. Without
   children the row is static: there is nothing more to show. */
export function IndexRow({
  id,
  title,
  meta,
  summary,
  children,
}: {
  id?: string;
  title: ReactNode;
  meta?: ReactNode;
  summary: ReactNode;
  children?: ReactNode;
}) {
  const { hash } = useLocation();
  const targeted = !!id && hash === `#${id}`;
  const [open, setOpen] = useState(targeted);
  const panelId = useId();
  const expandable = !!children;

  useEffect(() => {
    if (targeted) setOpen(true);
  }, [targeted]);

  return (
    <li className="idx-row" id={id}>
      <div className={expandable ? 'idx-head is-expandable' : 'idx-head'}>
        <h3 className="idx-title">
          {expandable ? (
            <button
              type="button"
              className="idx-toggle"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((o) => !o)}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        {meta && <span className="idx-meta">{meta}</span>}
        <span className="idx-summary">{summary}</span>
        {expandable && <span className="idx-more" aria-hidden="true">{open ? 'Less' : 'More'}</span>}
      </div>
      {expandable && (
        <div id={panelId} className="idx-panel" hidden={!open}>
          {children}
        </div>
      )}
    </li>
  );
}
