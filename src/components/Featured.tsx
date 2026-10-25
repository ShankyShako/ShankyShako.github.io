import type { ReactNode } from 'react';

/* A page's strongest items, given room. The title is a heading, never a link:
   links live in a `.links` row inside the children. */
export function Featured({
  as: Heading = 'h2',
  id,
  title,
  meta,
  large = false,
  children,
}: {
  as?: 'h2' | 'h3';
  id?: string;
  title: ReactNode;
  meta?: ReactNode;
  large?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className={large ? 'feat is-large' : 'feat'} id={id}>
      <Heading className="feat-title">{title}</Heading>
      {meta && <p className="feat-meta">{meta}</p>}
      {children}
    </article>
  );
}
