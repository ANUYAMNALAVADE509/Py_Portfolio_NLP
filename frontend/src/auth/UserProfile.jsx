import "./UserProfile.css";

export default function UserProfile({ user }) {
  if (!user) {
    return (
      <div className="qr-profile-loading">
        <div className="qr-profile-spinner" />
        <span>Loading profile...</span>
      </div>
    );
  }

  const provider =
    user.providerData?.[0]?.providerId || "password";

  const providerLabel =
    provider === "google.com"
      ? "Google"
      : provider === "password"
        ? "Email & Password"
        : provider;

  const accountName =
    user.displayName || "QuantRisk AI User";

  const initial = (
    user.displayName ||
    user.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className="qr-profile-page">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <header className="qr-profile-page-header">

        <div>
          <div className="qr-profile-breadcrumb">
            QuantRisk AI
            <span>/</span>
            User Profile
          </div>

          <h1>User Profile</h1>

          <p>
            Manage your account information and QuantRisk AI workspace.
          </p>
        </div>

      </header>


      {/* =====================================================
          PROFILE HERO
      ====================================================== */}

      <section className="qr-profile-hero">

        <div className="qr-profile-hero-main">

          {/* Avatar */}

          <div className="qr-profile-avatar-container">

            <div className="qr-profile-avatar">

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                />
              ) : (
                <span>{initial}</span>
              )}

            </div>

            <span className="qr-profile-online-indicator" />

          </div>


          {/* Identity */}

          <div className="qr-profile-identity">

            <div className="qr-profile-name-row">

              <h2>{accountName}</h2>

              <span className="qr-profile-status-badge">
                <span />
                Active
              </span>

            </div>

            <p className="qr-profile-email">
              {user.email || "Email not available"}
            </p>

            <div className="qr-profile-meta">

              <span className="qr-profile-provider">
                <span className="qr-provider-dot" />
                {providerLabel}
              </span>

              {user.emailVerified && (
                <>
                  <span className="qr-profile-meta-divider">
                    |
                  </span>

                  <span className="qr-profile-verified">
                    Email verified
                  </span>
                </>
              )}

            </div>

          </div>

        </div>


        {/* Hero account summary */}

        <div className="qr-profile-hero-summary">

          <div className="qr-profile-summary-item">

            <span className="qr-summary-label">
              ACCOUNT STATUS
            </span>

            <span className="qr-summary-value qr-summary-active">
              <span />
              Active
            </span>

          </div>

          <div className="qr-summary-divider" />

          <div className="qr-profile-summary-item">

            <span className="qr-summary-label">
              SIGN-IN METHOD
            </span>

            <span className="qr-summary-value">
              {providerLabel}
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          ACCOUNT INFORMATION
      ====================================================== */}

      <section className="qr-profile-section">

        <div className="qr-profile-section-heading">

          <div>
            <span className="qr-section-label">
              ACCOUNT
            </span>

            <h2>Account information</h2>

            <p>
              Your authenticated QuantRisk AI account details.
            </p>
          </div>

        </div>


        <div className="qr-profile-information-grid">

          {/* =================================================
              EMAIL
          ================================================== */}

          <article className="qr-profile-information-card">

            <div className="qr-information-card-header">

              <div className="qr-information-icon">
                <span className="qr-email-icon">
                  @
                </span>
              </div>

              <span className="qr-information-category">
                EMAIL
              </span>

            </div>

            <div className="qr-information-body">

              <h3>Email address</h3>

              <p className="qr-information-value">
                {user.email || "Not available"}
              </p>

              <p className="qr-information-description">
                Email associated with your authenticated account.
              </p>

            </div>

          </article>


          {/* =================================================
              AUTHENTICATION
          ================================================== */}

          <article className="qr-profile-information-card">

            <div className="qr-information-card-header">

              <div className="qr-information-icon">
                <span className="qr-auth-icon">
                  ●
                </span>
              </div>

              <span className="qr-information-category">
                AUTHENTICATION
              </span>

            </div>

            <div className="qr-information-body">

              <h3>Sign-in method</h3>

              <p className="qr-information-value">
                {providerLabel}
              </p>

              <p className="qr-information-description">
                Authentication method connected to your account.
              </p>

            </div>

          </article>


          {/* =================================================
              ACCOUNT STATUS
          ================================================== */}

          <article className="qr-profile-information-card">

            <div className="qr-information-card-header">

              <div className="qr-information-icon qr-status-icon">
                <span />
              </div>

              <span className="qr-information-category">
                STATUS
              </span>

            </div>

            <div className="qr-information-body">

              <h3>Account status</h3>

              <p className="qr-information-value qr-active-value">
                <span />
                Active
              </p>

              <p className="qr-information-description">
                Your QuantRisk AI account is currently authenticated.
              </p>

            </div>

          </article>


          {/* =================================================
              USER ID
          ================================================== */}

          <article className="qr-profile-information-card">

            <div className="qr-information-card-header">

              <div className="qr-information-icon">
                <span className="qr-id-icon">
                  ID
                </span>
              </div>

              <span className="qr-information-category">
                USER ID
              </span>

            </div>

            <div className="qr-information-body">

              <h3>Account identifier</h3>

              <div className="qr-user-id-box">
                {user.uid}
              </div>

              <p className="qr-information-description">
                Unique identifier assigned to your QuantRisk AI account.
              </p>

            </div>

          </article>

        </div>

      </section>


      {/* =====================================================
          PORTFOLIO WORKSPACE
      ====================================================== */}

      <section className="qr-profile-section qr-portfolio-section">

        <div className="qr-profile-section-heading">

          <div>
            <span className="qr-section-label">
              WORKSPACE
            </span>

            <h2>Portfolio connection</h2>

            <p>
              Your profile is connected to the portfolio workspace.
            </p>
          </div>

        </div>


        <article className="qr-portfolio-card">

          <div className="qr-portfolio-card-left">

            <div className="qr-portfolio-icon">
              Q
            </div>

            <div className="qr-portfolio-information">

              <h3>Portfolio workspace</h3>

              <p>
                Portfolio information and holdings are managed
                through the Dashboard &amp; Portfolio module of
                QuantRisk AI.
              </p>

            </div>

          </div>


          <div className="qr-portfolio-connected">

            <span />

            <div>
              <strong>Connected</strong>
              <small>Portfolio module</small>
            </div>

          </div>

        </article>

      </section>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="qr-profile-footer">

        <span className="qr-footer-brand">
          QUANTRISK AI
        </span>

        <span className="qr-footer-separator">
          •
        </span>

        <span>
          Secure account profile
        </span>

      </footer>

    </div>
  );
}