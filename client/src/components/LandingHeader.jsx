import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { logout } from "../api/authApi";
import { PRIMARY_NAV, getNavTo } from "../data/navigation.js";
import useCurrentUser from "../hooks/useCurrentUser.js";

import ConfirmDialog from "./ConfirmDialog.jsx";
import Toast from "./Toast.jsx";

import "./LandingHeader.css";

const navLinkClass = ({ isActive }) =>
  isActive
    ? "nwl-header-link nwl-header-link--active type-nav-link"
    : "nwl-header-link type-nav-link";

const AccountStatus = ({ user, onLogoutClick }) => {
  const displayName = user.name?.trim();
  const labeledName = displayName ? `${displayName}님` : "";
  const ariaLabel = labeledName ? `${labeledName}, 로그아웃` : "로그아웃";

  return (
    <button
      type="button"
      className="nwl-account"
      aria-label={ariaLabel}
      onClick={onLogoutClick}
    >
      {labeledName ? (
        <span className="nwl-account-name type-nav-link">{labeledName}</span>
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
          {displayName?.slice(0, 1) || "?"}
        </span>
      )}
    </button>
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
      <circle cx="12" cy="7" r="3.6" stroke="currentColor" strokeWidth="1.85" />
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toast, setToast] = useState(null);
  const menuButtonRef = useRef(null);
  const trayRef = useRef(null);
  const navigate = useNavigate();
  const { user, setUser } = useCurrentUser();

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (trayRef.current?.contains(target)) {
        return;
      }
      if (menuButtonRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  return (
    <header className="nwl-header">
      <div className="nwl-header-bar">
        <NavLink to="/" className="nwl-mark type-nav-link" end>
          Neverwatchlater
        </NavLink>

        <nav className="nwl-header-nav" aria-label="주요 메뉴">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={`${item.path}${item.hash ?? ""}`}
              to={getNavTo(item)}
              end
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nwl-header-actions">
          {user ? (
            <AccountStatus
              user={user}
              onLogoutClick={() => setConfirmLogout(true)}
            />
          ) : (
            <LoginStatus />
          )}

          <button
            ref={menuButtonRef}
            type="button"
            className={
              isMenuOpen
                ? "nwl-header-menu nwl-header-menu--open"
                : "nwl-header-menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="nwl-header-tray"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
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

      {isMenuOpen ? (
        <div className="nwl-header-backdrop" aria-hidden="true" />
      ) : null}

      <nav
        ref={trayRef}
        id="nwl-header-tray"
        className={
          isMenuOpen
            ? "nwl-header-tray nwl-header-tray--open"
            : "nwl-header-tray"
        }
        aria-label="모바일 메뉴"
        aria-hidden={!isMenuOpen}
      >
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={`tray-${item.path}${item.hash ?? ""}`}
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

      {confirmLogout ? (
        <ConfirmDialog
          title="로그아웃할까요?"
          description="로그인 상태가 해제됩니다."
          confirmLabel="로그아웃"
          cancelLabel="취소"
          onConfirm={() => {
            if (loggingOut) {
              return;
            }

            setLoggingOut(true);
            logout()
              .then(() => {
                setUser(null);
                setConfirmLogout(false);
                navigate("/");
              })
              .catch(() => {
                setToast({
                  tone: "error",
                  message: "로그아웃하지 못했습니다. 다시 시도해 주세요.",
                });
              })
              .finally(() => {
                setLoggingOut(false);
              });
          }}
          onCancel={() => setConfirmLogout(false)}
        />
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}
    </header>
  );
};

export default LandingHeader;
