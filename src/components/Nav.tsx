import { NavLink } from 'react-router-dom';
import { nav } from '../data/site';

export function Nav() {
  return (
    /* The <nav> itself is the sticky element — a sticky child would only be
       able to travel within this wrapper's own (short) box. */
    <nav className="tab-bar">
      <ul className="tabs">
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
