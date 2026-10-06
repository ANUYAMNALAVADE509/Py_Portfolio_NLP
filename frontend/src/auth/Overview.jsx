import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Walkthrough from "../components/Walkthrough";

import "./Overview.css";


const API_BASE =
  import.meta.env.VITE_API_URL || "";


const STOCKS = [
  {
    symbol: "RELIANCE.BSE",
    shortSymbol: "RELIANCE",
    name: "Reliance Industries",
  },
  {
    symbol: "TCS.BSE",
    shortSymbol: "TCS",
    name: "Tata Consultancy Services",
  },
  {
    symbol: "INFY.BSE",
    shortSymbol: "INFY",
    name: "Infosys",
  },
  {
    symbol: "HDFCBANK.BSE",
    shortSymbol: "HDFCBANK",
    name: "HDFC Bank",
  },
  {
    symbol: "ICICIBANK.BSE",
    shortSymbol: "ICICIBANK",
    name: "ICICI Bank",
  },
];


const LEARNING_TOPICS = [
  {
    title: "How stock prices work",
    text:
      "Understand how buyers, sellers, demand, supply, liquidity and market information interact to produce a quoted stock price.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Reading a price chart",
    text:
      "Learn how open, high, low and close prices form candles and how volume can provide additional context when studying price movements.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Understanding risk",
    text:
      "Risk is not represented by one universal number. Volatility, concentration, liquidity, drawdown and asset allocation can all matter.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Diversification",
    text:
      "Diversification means spreading exposure across investments so that portfolio behaviour is not dependent on a single security or asset.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Position sizing",
    text:
      "Position sizing is the process of deciding how much capital is exposed to an investment relative to the overall portfolio.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Understanding buy and sell orders",
    text:
      "Learn the difference between market orders and limit orders, and understand why execution price, liquidity and timing matter.",
    link:
      "https://investor.sebi.gov.in/",
    source: "SEBI Investor",
  },
  {
    title: "Understanding SIPs",
    text:
      "A SIP is a method of investing a fixed amount periodically into a mutual-fund scheme. It does not eliminate investment risk.",
    link:
      "https://www.amfiindia.com/investor/become-mf-distributor?zoneName=sip",
    source: "AMFI",
  },
  {
    title: "Reading mutual-fund risk",
    text:
      "Learn how the SEBI Risk-o-Meter communicates the risk level assigned to mutual-fund schemes.",
    link:
      "https://investor.sebi.gov.in/pdf/downloadable-documents/Financial%20Education%20Booklet%20-%20English.pdf",
    source: "SEBI Investor",
  },
];


const FAQS = [
  {
    question:
      "Does a SIP guarantee a return?",
    answer:
      "No. A SIP is an investment method. The underlying mutual-fund scheme remains subject to market risk and its value can rise or fall.",
  },
  {
    question:
      "Is a fund marked 'Very High' automatically a bad investment?",
    answer:
      "The Risk-o-Meter communicates the scheme's risk level; it does not by itself establish whether a scheme is suitable or unsuitable for every investor.",
  },
  {
    question:
      "Does past performance predict future returns?",
    answer:
      "No. Historical performance is information about the past and does not guarantee future performance.",
  },
  {
    question:
      "Why can my stock price differ from the price shown elsewhere?",
    answer:
      "Different providers may use different exchanges, timestamps, market-data entitlements, currencies or delayed feeds.",
  },
  {
    question:
      "What should I check before investing in a mutual fund?",
    answer:
      "Review the scheme documents, investment objective, risks, costs, portfolio, liquidity provisions and applicable regulatory disclosures.",
  },
  {
    question:
      "What does diversification actually do?",
    answer:
      "Diversification can reduce concentration in a single asset or security, but it cannot eliminate investment risk.",
  },
];


function formatCurrency(value, currency = "INR") {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}


function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const text = String(value);

  return text.includes("%")
    ? text
    : `${text}%`;
}


function getChangeClass(value) {
  const number = Number(
    String(value || "").replace("%", "")
  );

  if (Number.isNaN(number)) {
    return "";
  }

  if (number > 0) {
    return "positive";
  }

  if (number < 0) {
    return "negative";
  }

  return "neutral";
}


function todayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}


function AppLink({
  href,
  children,
  className = "",
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}


export default function Overview() {
  const [snapshot, setSnapshot] =
    useState(null);

  const [news, setNews] =
    useState({});

  const [loadingMarket, setLoadingMarket] =
    useState(true);

  const [loadingNews, setLoadingNews] =
    useState(true);

  const [marketError, setMarketError] =
    useState("");

  const [newsError, setNewsError] =
    useState("");

  const [learningIndex, setLearningIndex] =
    useState(0);

  const [openFaq, setOpenFaq] =
    useState(null);


  /*
   * Rotate the learning topic every day.
   *
   * This is educational content rotation,
   * not a personalised trading recommendation.
   */
  useEffect(() => {
    const key = `quantrisk-learning-${todayKey()}`;

    const stored =
      window.localStorage.getItem(key);

    if (stored !== null) {
      setLearningIndex(
        Number(stored) %
          LEARNING_TOPICS.length
      );

      return;
    }

    const dayIndex =
      Math.floor(
        Date.now() /
          (1000 * 60 * 60 * 24)
      ) %
      LEARNING_TOPICS.length;

    setLearningIndex(dayIndex);

    window.localStorage.setItem(
      key,
      String(dayIndex)
    );
  }, []);


  /*
   * Fetch market snapshot.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadMarket() {
      setLoadingMarket(true);
      setMarketError("");

      try {
        const response =
          await fetch(
            `${API_BASE}/api/market/snapshot`
          );

        if (!response.ok) {
          throw new Error(
            `Market API returned ${response.status}`
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setSnapshot(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMarketError(
            error.message ||
              "Unable to load market data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMarket(false);
        }
      }
    }

    loadMarket();

    /*
     * Do not poll aggressively.
     * The provider's free API has request limits.
     */
    const timer =
      window.setInterval(
        loadMarket,
        5 * 60 * 1000
      );

    return () =>
      window.clearInterval(timer);
  }, []);


  /*
   * Fetch news for every configured stock.
   *
   * Requests are intentionally limited to one
   * request per stock and cached by the backend.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoadingNews(true);
      setNewsError("");

      try {
        const entries =
          await Promise.all(
            STOCKS.map(async (stock) => {
              const response =
                await fetch(
                  `${API_BASE}/api/market/news/${encodeURIComponent(
                    stock.symbol
                  )}?limit=5`
                );

              if (!response.ok) {
                throw new Error(
                  `News request failed for ${stock.shortSymbol}`
                );
              }

              const data =
                await response.json();

              return [
                stock.symbol,
                data.articles || [],
              ];
            })
          );

        if (!cancelled) {
          setNews(
            Object.fromEntries(entries)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setNewsError(
            error.message ||
              "Unable to load stock news."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingNews(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, []);


  const stocks =
    snapshot?.stocks || [];

  const metals =
    snapshot?.metals || [];


  const gold =
    metals.find(
      (item) =>
        String(item.symbol)
          .toUpperCase()
          .includes("GOLD")
    );

  const silver =
    metals.find(
      (item) =>
        String(item.symbol)
          .toUpperCase()
          .includes("SILVER")
    );


  const latestNews =
    useMemo(() => {
      return STOCKS.flatMap(
        (stock) =>
          (news[stock.symbol] || []).map(
            (article) => ({
              ...article,
              stock,
            })
          )
      ).slice(0, 10);
    }, [news]);


  const learning =
    LEARNING_TOPICS[learningIndex];


  return (
    <div className="overview-page">

      {/* =========================
          HERO
      ========================== */}

      <section
        className="overview-hero"
        id="overview-top"
      >
        <div className="hero-copy">

          <span className="section-eyebrow">
            QUANTRISK AI · MARKET INTELLIGENCE
          </span>

          <h1>
            Understand the market.
            <br />
            Understand the risk.
          </h1>

          <p>
            A single workspace for market
            information, portfolio intelligence,
            financial education and risk context.
          </p>

          <div className="hero-actions">

            <a
              href="#market-snapshot"
              className="primary-action"
            >
              Explore markets
              <span>↓</span>
            </a>

            <a
              href="#learn"
              className="secondary-action"
            >
              Learn before investing
            </a>

          </div>

        </div>

        <div className="hero-market-card">

          <div className="hero-card-header">
            <span>
              MARKET DATA
            </span>

            <span className="live-status">
              <span className="status-dot" />
              API CONNECTED
            </span>
          </div>

          <div className="hero-card-main">

            <div>
              <small>
                Gold spot
              </small>

              <strong>
                {loadingMarket
                  ? "Loading…"
                  : gold
                    ? `${gold.price || "—"}`
                    : "—"}
              </strong>

              <span>
                USD / troy oz
              </span>
            </div>

            <div>
              <small>
                Silver spot
              </small>

              <strong>
                {loadingMarket
                  ? "Loading…"
                  : silver
                    ? `${silver.price || "—"}`
                    : "—"}
              </strong>

              <span>
                USD / troy oz
              </span>
            </div>

          </div>

          <p className="hero-source">
            Market figures are supplied by the
            configured market-data provider.
          </p>

        </div>
      </section>


      {/* =========================
          WALKTHROUGH
      ========================== */}

      <Walkthrough />


      {/* =========================
          MARKET SNAPSHOT
      ========================== */}

      <section
        className="overview-section"
        id="market-snapshot"
      >

        <div className="section-heading">

          <div>
            <span className="section-eyebrow">
              TODAY'S MARKET
            </span>

            <h2>
              Market Snapshot
            </h2>

            <p>
              Latest available market information
              from the connected data provider.
            </p>
          </div>

          <div className="market-source">
            {snapshot?.source ||
              "Market API"}
          </div>

        </div>


        {marketError && (
          <div className="api-warning">
            <strong>
              Market data unavailable
            </strong>

            <span>
              {marketError}
            </span>
          </div>
        )}


        <div className="market-grid">

          {loadingMarket
            ? Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  className="market-card skeleton-card"
                  key={index}
                >
                  <div className="skeleton skeleton-small" />
                  <div className="skeleton skeleton-large" />
                  <div className="skeleton skeleton-medium" />
                </div>
              ))
            : stocks.map((stock) => (
                <div
                  className="market-card"
                  key={stock.symbol}
                >

                  <div className="market-card-top">
                    <span className="ticker">
                      {stock.symbol}
                    </span>

                    <span
                      className={`change ${getChangeClass(
                        stock.change_percent
                      )}`}
                    >
                      {formatPercent(
                        stock.change_percent
                      )}
                    </span>
                  </div>

                  <h3>
                    {formatCurrency(
                      stock.price
                    )}
                  </h3>

                  <p>
                    {stock.change || "—"} today
                  </p>

                  <small>
                    {stock.latest_trading_day ||
                      "Latest available"}
                  </small>

                </div>
              ))}

        </div>


        <div className="asset-strip">

          <div className="asset-card">

            <div>
              <span>
                GOLD SPOT
              </span>

              <strong>
                {gold?.price || "—"}
              </strong>
            </div>

            <small>
              {gold?.unit ||
                "Provider-reported unit"}
            </small>

          </div>


          <div className="asset-card">

            <div>
              <span>
                SILVER SPOT
              </span>

              <strong>
                {silver?.price || "—"}
              </strong>
            </div>

            <small>
              {silver?.unit ||
                "Provider-reported unit"}
            </small>

          </div>


          <AppLink
            href="https://www.gold.org/goldhub/data/gold-prices"
            className="asset-reference"
          >
            View gold reference data →
          </AppLink>

        </div>

      </section>


      {/* =========================
          PORTFOLIO / NEWS
      ========================== */}

      <section
        className="overview-section"
        id="portfolio-news"
      >

        <div className="section-heading">

          <div>
            <span className="section-eyebrow">
              PORTFOLIO INTELLIGENCE
            </span>

            <h2>
              News around tracked stocks
            </h2>

            <p>
              News is retrieved separately for each
              configured stock symbol.
            </p>
          </div>

        </div>


        {newsError && (
          <div className="api-warning">
            <strong>
              News data unavailable
            </strong>

            <span>
              {newsError}
            </span>
          </div>
        )}


        <div className="news-layout">

          <div className="stock-news-list">

            {loadingNews
              ? Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    className="news-card skeleton-card"
                    key={index}
                  >
                    <div className="skeleton skeleton-small" />
                    <div className="skeleton skeleton-large" />
                    <div className="skeleton skeleton-medium" />
                  </div>
                ))
              : latestNews.map(
                  (article, index) => (
                    <article
                      className="news-card"
                      key={`${article.url}-${index}`}
                    >

                      <div className="news-meta">

                        <span>
                          {article.stock.shortSymbol}
                        </span>

                        <span>
                          {article.source ||
                            "Source unavailable"}
                        </span>

                      </div>

                      <h3>
                        {article.title ||
                          "Untitled article"}
                      </h3>

                      <p>
                        {article.summary ||
                          "Open the source for the full article."}
                      </p>

                      <AppLink
                        href={
                          article.url ||
                          "https://www.alphavantage.co/"
                        }
                        className="news-link"
                      >
                        Read source →
                      </AppLink>

                    </article>
                  )
                )}

          </div>


          <aside className="news-side-card">

            <span className="section-eyebrow">
              DATA DISCIPLINE
            </span>

            <h3>
              No invented market stories.
            </h3>

            <p>
              QuantRisk AI should display the
              provider's article, source and timestamp
              rather than generating fictional news.
            </p>

            <p>
              Sentiment fields should be treated as
              provider-generated analytical metadata,
              not as a recommendation to buy or sell.
            </p>

          </aside>

        </div>

      </section>


      {/* =========================
          LEARNING
      ========================== */}

      <section
        className="overview-section learning-section"
        id="learn"
      >

        <div className="learning-card">

          <div className="learning-index">
            {String(
              learningIndex + 1
            ).padStart(2, "0")}
          </div>

          <div className="learning-content">

            <span className="section-eyebrow">
              TODAY'S LEARNING
            </span>

            <h2>
              {learning.title}
            </h2>

            <p>
              {learning.text}
            </p>

            <div className="learning-actions">

              <AppLink
                href={learning.link}
                className="primary-action"
              >
                Open reliable resource
                <span>↗</span>
              </AppLink>

              <span className="resource-label">
                Source: {learning.source}
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          SIP
      ========================== */}

      <section
        className="overview-section"
        id="sip"
      >

        <div className="section-heading">

          <div>
            <span className="section-eyebrow">
              INVESTING EDUCATION
            </span>

            <h2>
              SIP: understand the method
            </h2>

            <p>
              A SIP is a periodic investment method,
              not a guarantee of returns.
            </p>
          </div>

        </div>


        <div className="education-grid">

          <article className="education-card">

            <span className="education-number">
              01
            </span>

            <h3>
              What is a SIP?
            </h3>

            <p>
              AMFI describes a Systematic Investment
              Plan as a method of investing a fixed
              amount periodically into a mutual-fund
              scheme.
            </p>

            <AppLink
              href="https://www.amfiindia.com/investor/become-mf-distributor?zoneName=sip"
              className="text-link"
            >
              Learn from AMFI →
            </AppLink>

          </article>


          <article className="education-card">

            <span className="education-number">
              02
            </span>

            <h3>
              What are the possible benefits?
            </h3>

            <p>
              Regular investing can support disciplined
              investing and may provide rupee-cost
              averaging. These features do not remove
              market risk.
            </p>

            <AppLink
              href="https://www.amfiindia.com/Themes/Theme1/downloads/InvestorsAwarenessProgrampresentation.pdf"
              className="text-link"
            >
              Read AMFI material →
            </AppLink>

          </article>


          <article className="education-card">

            <span className="education-number">
              03
            </span>

            <h3>
              What are the risks?
            </h3>

            <p>
              Mutual-fund values can rise or fall.
              Schemes are not guaranteed-return products,
              and investors can lose principal.
            </p>

            <AppLink
              href="https://www.amfiindia.com/investor/knowledge-center-info?zoneName=riskInMutualFunds"
              className="text-link"
            >
              Read AMFI risk factors →
            </AppLink>

          </article>

        </div>


        <div className="mandatory-warning">

          <strong>
            IMPORTANT INVESTOR WARNING
          </strong>

          <p>
            Mutual Fund investments are subject to
            market risks, read all the related documents
            carefully before investing.
          </p>

        </div>

      </section>


      {/* =========================
          NEW FUND OFFERS
      ========================== */}

      <section
        className="overview-section"
        id="funds"
      >

        <div className="funds-panel">

          <div>

            <span className="section-eyebrow">
              MUTUAL FUND INFORMATION
            </span>

            <h2>
              Latest New Fund Offers
            </h2>

            <p>
              Use the official AMFI NFO listing rather
              than a manually maintained list that can
              become stale.
            </p>

          </div>

          <AppLink
            href="https://www.amfiindia.com/new-fund-offer"
            className="primary-action"
          >
            View current NFOs
            <span>↗</span>
          </AppLink>

        </div>


        <div className="fund-disclaimer">

          <strong>
            About “safe funds”
          </strong>

          <p>
            QuantRisk AI should not label a mutual fund
            as “safe” or “guaranteed”. Mutual-fund schemes
            carry different levels of risk, represented
            through the SEBI Risk-o-Meter.
          </p>

          <AppLink
            href="https://investor.sebi.gov.in/pdf/downloadable-documents/Financial%20Education%20Booklet%20-%20English.pdf"
            className="text-link"
          >
            Understand the SEBI Risk-o-Meter →
          </AppLink>

        </div>

      </section>


      {/* =========================
          RISK EDUCATION
      ========================== */}

      <section
        className="overview-section"
        id="risk"
      >

        <div className="section-heading">

          <div>

            <span className="section-eyebrow">
              RISK INTELLIGENCE
            </span>

            <h2>
              Understand risk before the number
            </h2>

            <p>
              Risk scores should describe measurable
              characteristics rather than make an
              investment recommendation.
            </p>

          </div>

        </div>


        <div className="risk-grid">

          <div className="risk-card">

            <span>
              VOLATILITY
            </span>

            <h3>
              Price variability
            </h3>

            <p>
              Volatility describes how widely returns
              or prices vary over a specified period.
            </p>

          </div>


          <div className="risk-card">

            <span>
              VaR
            </span>

            <h3>
              Loss threshold measure
            </h3>

            <p>
              Value at Risk is a statistical risk
              measure used under a defined confidence
              level and time horizon.
            </p>

          </div>


          <div className="risk-card">

            <span>
              BETA
            </span>

            <h3>
              Market sensitivity
            </h3>

            <p>
              Beta is commonly used to describe an
              asset's historical sensitivity to movements
              in a reference market.
            </p>

          </div>


          <div className="risk-card">

            <span>
              DIVERSIFICATION
            </span>

            <h3>
              Concentration context
            </h3>

            <p>
              Diversification considers how exposure is
              distributed rather than relying on one
              security or asset.
            </p>

          </div>

        </div>


        <div className="risk-resource">

          <div>

            <span className="section-eyebrow">
              OFFICIAL RESOURCE
            </span>

            <h3>
              SEBI Financial Education
            </h3>

            <p>
              Read the regulator's investor education
              material on mutual funds, risk and investing.
            </p>

          </div>

          <AppLink
            href="https://investor.sebi.gov.in/pdf/downloadable-documents/Financial%20Education%20Booklet%20-%20English.pdf"
            className="secondary-action"
          >
            Read SEBI guide ↗
          </AppLink>

        </div>

      </section>


      {/* =========================
          FAQ
      ========================== */}

      <section
        className="overview-section"
        id="faq"
      >

        <div className="section-heading">

          <div>

            <span className="section-eyebrow">
              INVESTOR FAQ
            </span>

            <h2>
              Questions investors actually ask
            </h2>

          </div>

        </div>


        <div className="faq-list">

          {FAQS.map((faq, index) => (
            <div
              className={`faq-item ${
                openFaq === index
                  ? "open"
                  : ""
              }`}
              key={faq.question}
            >

              <button
                type="button"
                onClick={() =>
                  setOpenFaq(
                    openFaq === index
                      ? null
                      : index
                  )
                }
                className="faq-question"
              >
                <span>
                  {faq.question}
                </span>

                <span>
                  {openFaq === index
                    ? "−"
                    : "+"}
                </span>

              </button>


              {openFaq === index && (
                <div className="faq-answer">
                  <p>
                    {faq.answer}
                  </p>
                </div>
              )}

            </div>
          ))}

        </div>

      </section>


      {/* =========================
          ABOUT / RESOURCES
      ========================== */}

      <section
        className="overview-section about-section"
        id="about"
      >

        <div className="about-grid">

          <div>

            <span className="section-eyebrow">
              ABOUT QUANTRISK AI
            </span>

            <h2>
              Financial information,
              explained with context.
            </h2>

            <p>
              QuantRisk AI is designed as a financial
              portfolio and risk-intelligence workspace
              combining market information, portfolio
              analysis, NLP intelligence and explainable
              risk concepts.
            </p>

            <p>
              Market figures and third-party educational
              information remain subject to their respective
              data providers and source documents.
            </p>

          </div>


          <div className="contact-card">

            <span className="section-eyebrow">
              INVESTOR SUPPORT
            </span>

            <h3>
              Official resources
            </h3>

            <p>
              For regulatory investor information,
              use the official SEBI and AMFI channels.
            </p>


            <a
              href="mailto:asksebi@sebi.gov.in"
              className="contact-link"
            >
              asksebi@sebi.gov.in
            </a>


            <a
              href="tel:18002667575"
              className="contact-link"
            >
              1800-266-7575
            </a>


            <div className="contact-actions">

              <AppLink
                href="https://investor.sebi.gov.in/Investor-support.html"
                className="text-link"
              >
                SEBI Investor Support →
              </AppLink>

              <AppLink
                href="https://www.amfiindia.com/contact"
                className="text-link"
              >
                AMFI Contact →
              </AppLink>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          FOOTER WARNING
      ========================== */}

      <footer className="overview-footer">

        <div className="footer-warning">

          <strong>
            IMPORTANT
          </strong>

          <span>
            Information displayed by QuantRisk AI is
            for informational and educational purposes.
            It is not a guarantee of returns and should
            not be treated as personalised investment
            advice.
          </span>

        </div>


        <div className="footer-links">

          <AppLink
            href="https://www.sebi.gov.in/"
          >
            SEBI
          </AppLink>

          <AppLink
            href="https://www.amfiindia.com/"
          >
            AMFI
          </AppLink>

          <AppLink
            href="https://www.gold.org/goldhub/data/gold-prices"
          >
            World Gold Council
          </AppLink>

        </div>

      </footer>

    </div>
  );
}