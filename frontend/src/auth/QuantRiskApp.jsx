import React from "react";
import { Navigate, useLocation, NavLink } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import NLPIntelligence from "../nlp/NLPIntelligence";
import AIAssistant from "./AIAssistant";
import UserProfile from "./UserProfile";
import Overview from "./Overview";

import Dashboard from "../pages/Dashboard";
import RiskAnalysis from "../pages/RiskAnalysis";

function BlankPage({ title }) {
  return (
    <div className="page-content">
      <div className="page-welcome">
        <span className="page-eyebrow">QUANTRISK AI</span>

        <h1>{title}</h1>

        <p>
          This section is ready for your portfolio
          intelligence features.
        </p>
      </div>

      <div className="development-card">
        <div className="development-icon">↗</div>

        <div>
          <h2>{title} workspace</h2>

          <p>
            Your {title.toLowerCase()} tools and
            insights will appear here.
          </p>

          <span className="development-status">
            Under development
          </span>
        </div>
      </div>
    </div>
  );
}


function CurrentPage({ user, pathname }) {
  switch (pathname) {
    case "/overview":
      return <Overview />;

case "/dashboard":
    return <Dashboard />;

case "/risk-analysis":
    return <RiskAnalysis />;
    case "/nlp":
      return <NLPIntelligence />;

    case "/assistant":
      return <AIAssistant />;

    case "/profile":
      return <UserProfile user={user} />;

    default:
      return <Navigate to="/overview" replace />;
  }
}


function getPageTitle(pathname) {
  const titles = {
    "/overview": "Overview",
    "/dashboard": "Dashboard & Portfolio",
    "/risk-analysis": "Risk Analysis",
    "/nlp": "NLP Intelligence",
    "/assistant": "AI Assistant",
    "/profile": "User Profile",
  };

  return titles[pathname] || "Overview";
}


function Topbar({ user, title }) {
  const displayName =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const initial =
    displayName.charAt(0).toUpperCase() || "U";

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <div className="breadcrumb">
          QuantRisk AI / {title}
        </div>

        <h3>{title}</h3>
      </div>

      <div className="topbar-actions">
        <NavLink
          to="/profile"
          className="user-profile topbar-user-link"
          aria-label="Open user profile"
        >
          <div className="avatar">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="topbar-avatar-image"
              />
            ) : (
              initial
            )}
          </div>

          <div className="user-details">
            <strong>{displayName}</strong>

            <span>
              {user?.email || "Signed in"}
            </span>
          </div>
        </NavLink>
      </div>
    </header>
  );
}


export default function QuantRiskApp({ user }) {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === "/") {
    return <Navigate to="/overview" replace />;
  }

  const title = getPageTitle(pathname);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <Topbar
          user={user}
          title={title}
        />

        <div className="app-page-host">
          <CurrentPage
            user={user}
            pathname={pathname}
          />
        </div>
      </main>
    </div>
  );
}