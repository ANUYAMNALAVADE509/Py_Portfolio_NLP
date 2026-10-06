
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutUser } from "../firebase/authService";
import "./Sidebar.css";

/* =====================================
   QUANTRISK AI - ASSET PATHS
   Images must be inside public/icons/
===================================== */

const asset = (filename) => {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/")
    ? base
    : `${base}/`;

  return `${normalizedBase}icons/${filename}`;
};

/* =====================================
   SIDEBAR NAVIGATION
===================================== */

const menuItems = [
  {
    label: "Overview",
    path: "/overview",
    icon: "overview.png",
    fallback: "⌂",
  },
  {
    label: "Dashboard & Portfolio",
    path: "/dashboard",
    icon: "dashboard_portfolio.png",
    fallback: "▦",
  },
  {
    label: "Risk Analysis",
    path: "/risk-analysis",
    icon: "risk_analysis.png",
    fallback: "◇",
  },
  {
    label: "NLP Intelligence",
    path: "/nlp",
    icon: "nlp.png",
    fallback: "◎",
  },
  {
    label: "AI Assistant",
    path: "/assistant",
    icon: "ai_assistant.png",
    fallback: "✧",
  },
  {
    label: "User Profile",
    path: "/profile",
    icon: "user_profile.png",
    fallback: "♙",
  },
];

/* =====================================
   IMAGE WITH ERROR FALLBACK
===================================== */

function SidebarImage({
  filename,
  alt,
  className,
  fallback,
  fallbackClassName = "",
}) {
  const [failed, setFailed] = useState(false);

  const src = asset(filename);

  if (failed) {
    return (
      <span
        className={`${className} ${fallbackClassName} icon-fallback`}
        role="img"
        aria-label={alt}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable="false"
      onError={(event) => {
        // Avoid logging the same failure repeatedly.
        if (!event.currentTarget.dataset.logged) {
          event.currentTarget.dataset.logged = "true";
          console.error(
            `Sidebar image not found or could not load: ${src}`
          );
        }

        setFailed(true);
      }}
    />
  );
}

/* =====================================
   SIDEBAR COMPONENT
===================================== */

export default function Sidebar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
    }
  };

  return (
    <aside className="sidebar">
      {/* BRAND */}
      <div className="sidebar-brand">
        <NavLink
          to="/overview"
          className="brand-link"
          aria-label="QuantRisk AI Overview"
        >
          <SidebarImage
            filename="quantrisk-logo.svg"
            alt="QuantRisk AI logo"
            className="brand-logo"
            fallback="Q"
            fallbackClassName="brand-logo-fallback"
          />

          <div className="brand-text">
            <span className="brand-name">QuantRisk</span>
            <span className="brand-subtitle">AI</span>
          </div>
        </NavLink>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-menu" aria-label="Main navigation">
        <div className="menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `menu-item${isActive ? " active" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <SidebarImage
                    filename={item.icon}
                    alt=""
                    className="menu-icon"
                    fallback={item.fallback}
                    fallbackClassName="menu-icon-fallback"
                  />

                  <span className="menu-label">
                    {item.label}
                  </span>

                  {isActive && (
                    <span
                      className="menu-active-indicator"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <SidebarImage
            filename="status-online.svg"
            alt=""
            className="status-dot"
            fallback="●"
            fallbackClassName="status-dot-fallback"
          />
          <span>System Operational</span>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <span className="logout-icon" aria-hidden="true">
            ↪
          </span>
          <span>
            {loggingOut ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
}