import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { PRIMARY_NAV, getNavTo } from '../data/navigation.js';
import useCurrentUser from '../hooks/useCurrentUser.js';

import './LandingHeader.css';

const navLinkClass = ({ isActive }) =>
  isActive
    ? 'nwl-header-link nwl-header-link--active type-nav-link'
    : 'nwl-header-link type-nav-link';

const AccountStatus = ({ user }) => {
  const displayName = user.name?.trim();

  return (
    <div className="nwl-account" aria-label={displayName || '로그인됨'}>
      {displayName ? (
        <span className="nwl-account-name type-nav-link">{displayName}</span>
      ) : null}
      {user.picture ? (
        <img
          className="nwl-account-photo"
          src={user.picture}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="nwl-account-fallback" aria-hidden="true">
          {displayName?.slice(0, 1) || '?'}
        </span>
      )}
    </div>
  );
};

const LoginStatus = () => (
  <NavLink to="/auth/loading" className="nwl-status" aria-label="로그인">
    <svg
      className="nwl-status-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="7"
        r="3.6"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <path
        d="M4.8 19.2C6.2 13.6 8.8 12.2 12 12.2s5.8 1.4 7.2 7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  </NavLink>
);

const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useCurrentUser();

  return (
    <header className="nwl-header">
      <div className="nwl-header-bar">
        <NavLink to="/" className="nwl-mark type-nav-link" end>
          Neverwatchlater
        </NavLink>

        <nav className="nwl-header-nav" aria-label="주요 메뉴">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={`${item.path}${item.hash ?? ''}`}
              to={getNavTo(item)}
              end
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nwl-header-actions">
          {user ? <AccountStatus user={user} /> : <LoginStatus />}

          <button
            type="button"
            className={
              isMenuOpen
                ? 'nwl-header-menu nwl-header-menu--open'
                : 'nwl-header-menu'
            }
            aria-expanded={isMenuOpen}
            aria-controls="nwl-header-tray"
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <svg
              className="nwl-header-menu-icon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 7h14M5 12h14M5 17h14"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <nav
        id="nwl-header-tray"
        className={
          isMenuOpen ? 'nwl-header-tray nwl-header-tray--open' : 'nwl-header-tray'
        }
        aria-label="모바일 메뉴"
        aria-hidden={!isMenuOpen}
      >
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={`tray-${item.path}${item.hash ?? ''}`}
            to={getNavTo(item)}
            end
            className="nwl-header-tray-link type-nav-link"
            tabIndex={isMenuOpen ? undefined : -1}
            onClick={() => setIsMenuOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};

export default LandingHeader;
