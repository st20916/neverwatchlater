import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { PRIMARY_NAV } from '../data/navigation.js';

import './GlobalNav.css';

const GlobalNav = () => {
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  return (
    <header className="global-nav">
      <div className="global-nav__bar">
        <NavLink to="/" className="global-nav__brand type-nav-link">
          Neverwatchlater
        </NavLink>

        <nav className="global-nav__links" aria-label="주요 메뉴">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                isActive
                  ? 'global-nav__link global-nav__link--active type-nav-link'
                  : 'global-nav__link type-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="global-nav__actions">
          <NavLink to="/" className="btn-dark-utility global-nav__sign-in">
            로그인
          </NavLink>
          <button
            type="button"
            className="global-nav__hamburger"
            aria-expanded={isTrayOpen}
            aria-label="메뉴 열기"
            onClick={() => setIsTrayOpen((open) => !open)}
          >
            <span aria-hidden="true">≡</span>
          </button>
        </div>
      </div>

      {isTrayOpen ? (
        <nav className="global-nav__tray" aria-label="모바일 메뉴">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className="global-nav__tray-link type-caption"
              onClick={() => setIsTrayOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
};

export default GlobalNav;
