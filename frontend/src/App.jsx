import { useState } from "react";
import NLPIntelligence from "./nlp/NLPIntelligence";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Overview");

  const menuItems = [
    "Overview",
    "Dashboard & Portfolio",
    "Risk Analysis",
    "NLP Intelligence",
    "AI Assistant",
    "User Profile",
  ];

  const renderPage = () => {
    switch (activePage) {
      case "Overview":
        return <div className="blank-page" />;

      case "Dashboard & Portfolio":
        return <div className="blank-page" />;

      case "Risk Analysis":
        return <div className="blank-page" />;

      case "NLP Intelligence":
        return <NLPIntelligence />;

      case "AI Assistant":
        return <div className="blank-page" />;

      case "User Profile":
        return <div className="blank-page" />;

      default:
        return <div className="blank-page" />;
    }
  };

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">Q</div>

          <div className="brand-text">
            <h2>QuantRisk</h2>
            <span>AI Portfolio Intelligence</span>
          </div>
        </div>

        <nav className="navigation">

          <p className="nav-label">MAIN MENU</p>

          {menuItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${
                activePage === item ? "active" : ""
              }`}
              onClick={() => setActivePage(item)}
            >
              <span className="nav-dot"></span>
              <span>{item}</span>
            </button>
          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="system-status">
            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>QuantRisk AI</small>
            </div>
          </div>

        </div>

      </aside>

      {/* MAIN AREA */}
      <main className="main-area">

        <header className="topbar">

          <div>
            <span className="breadcrumb">
              QuantRisk AI / {activePage}
            </span>

            <h3>{activePage}</h3>
          </div>

          <div className="topbar-actions">

            <div className="notification">
              🔔
            </div>

            <div className="user-profile">

              <div className="avatar">
                A
              </div>

              <div>
                <strong>User</strong>
                <span>Investor</span>
              </div>

            </div>

          </div>

        </header>

        <section className="content-area">
          {renderPage()}
        </section>

      </main>

    </div>
  );
}

export default App;