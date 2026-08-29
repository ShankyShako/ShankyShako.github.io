import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { nav } from '../data/site';

export function Nav() {
  const list = useRef<HTMLUListElement>(null);
  const { pathname } = useLocation();

  /* On a phone the tab row scrolls instead of wrapping, so the pill for the
     page you are on can sit off-screen. Pull it into view on every route
     change; on desktop the row never overflows and this is a no-op. */
  useEffect(() => {
    list.current
      ?.querySelector('.tab.active')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [pathname]);

  return (
    /* The <nav> itself is the sticky element — a sticky child would only be
       able to travel within this wrapper's own (short) box. */
    <nav className="tab-bar">
      <ul className="tabs" ref={list}>
        {nav.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'tab active' : 'tab')}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
