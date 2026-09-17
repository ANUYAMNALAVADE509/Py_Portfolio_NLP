import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./NLPIntelligence.css";

/* =========================================================
   API CONFIGURATION

   React calls /api/...
   Vite proxies /api to FastAPI.

   DO NOT change this to:
   http://127.0.0.1:8000
   ========================================================= */

const API_BASE_URL = "";

const DEFAULT_SYMBOLS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
];

const DEFAULT_ARTICLE_COUNT = 5;

const MIN_ARTICLE_COUNT = 1;

const MAX_ARTICLE_COUNT = 20;

/*
   Automatic refresh every 5 minutes.
*/
const REFRESH_INTERVAL = 5 * 60 * 1000;


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

/*
   Converts:

   "RELIANCE.NS, TCS.NS, INFY.NS"

   into:

   ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
*/
function normalizeSymbols(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");

  const cleaned = list
    .map((symbol) =>
      String(symbol)
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);

  /*
     Remove duplicate symbols while
     preserving their original order.
  */
  const uniqueSymbols = [
    ...new Set(cleaned),
  ];

  return uniqueSymbols.length > 0
    ? uniqueSymbols
    : DEFAULT_SYMBOLS;
}


/*
   Safely normalize article count.
*/
function normalizeArticleCount(value) {
  const parsed = Math.floor(
    Number(value)
  );

  if (
    !Number.isFinite(parsed) ||
    parsed < MIN_ARTICLE_COUNT
  ) {
    return DEFAULT_ARTICLE_COUNT;
  }

  return Math.min(
    parsed,
    MAX_ARTICLE_COUNT
  );
}


/*
   Safely convert a value to a number.
*/
function safeNumber(
  value,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


/*
   Format numerical values.
*/
function formatNumber(
  value,
  decimals = 2
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toFixed(decimals);
}


/*
   Format dates safely.
*/
function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString();
}


/*
   Convert sentiment into CSS class.
*/
function getSentimentClass(sentiment) {
  const value = String(
    sentiment || ""
  ).trim().toLowerCase();

  if (value === "positive") {
    return "positive";
  }

  if (value === "negative") {
    return "negative";
  }

  if (value === "neutral") {
    return "neutral";
  }

  return "unknown";
}


/*
   Convert risk level into CSS class.
*/
function getRiskClass(level) {
  const value = String(
    level || ""
  ).trim().toLowerCase();

  if (value === "high") {
    return "high";
  }

  if (value === "medium") {
    return "medium";
  }

  if (value === "low") {
    return "low";
  }

  return "unknown";
}


/*
   Safely extract article date.
*/
function getArticleDate(article) {
  return (
    article?.published_at ||
    article?.published ||
    article?.publishedAt ||
    article?.date ||
    article?.datetime ||
    null
  );
}


/*
   Safely extract article URL.
*/
function getArticleUrl(article) {
  return (
    article?.url ||
    article?.link ||
    article?.article_url ||
    article?.articleUrl ||
    null
  );
}


/*
   Safely extract article title.
*/
function getArticleTitle(article) {
  return (
    article?.title ||
    article?.headline ||
    article?.name ||
    "Untitled article"
  );
}


/*
   Safely extract article source.
*/
function getArticleSource(article) {
  return (
    article?.source ||
    article?.publisher ||
    article?.provider ||
    "Unknown source"
  );
}


/*
   Safely extract article summary.
*/
function getArticleSummary(article) {
  return (
    article?.summary ||
    article?.description ||
    article?.text ||
    article?.content ||
    "No summary available."
  );
}


/* =========================================================
   API URL
   ========================================================= */

/*
   IMPORTANT:

   Every request gets a unique "_ts" value.

   This prevents browser/proxy caching.

   Example:

   /api/nlp/portfolio-news
       ?symbols=RELIANCE.NS,TCS.NS
       &count=5
       &_ts=1758123456789
*/
function buildPortfolioNewsUrl(
  symbols,
  count
) {
  const params =
    new URLSearchParams();

  params.set(
    "symbols",
    symbols.join(",")
  );

  params.set(
    "count",
    String(count)
  );

  /*
     Cache-busting parameter.
  */
  params.set(
    "_ts",
    String(Date.now())
  );

  return (
    `${API_BASE_URL}/api/nlp/portfolio-news?` +
    params.toString()
  );
}


/* =========================================================
   API FETCH
   ========================================================= */

async function fetchJson(
  url,
  options = {}
) {
  let response;

  try {
    response = await fetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          "Cache-Control":
            "no-cache",

          Pragma:
            "no-cache",
        },

        /*
           Tell browser not to use cached response.
        */
        cache: "no-store",

        ...options,
      }
    );
  } catch (error) {
    console.error(
      "[QuantRisk AI] Network error:",
      error
    );

    /*
       AbortError is handled separately
       by fetchNLPData().
    */
    if (
      error?.name ===
      "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Unable to connect to the NLP service through the Vite proxy."
    );
  }

  const responseText =
    await response.text();

  let result = null;

  /*
     Parse JSON safely.
  */
  if (responseText) {
    try {
      result =
        JSON.parse(
          responseText
        );
    } catch (error) {
      console.error(
        "[QuantRisk AI] Invalid JSON response:",
        responseText
      );

      throw new Error(
        `The NLP server returned an invalid response. HTTP ${response.status}.`
      );
    }
  }

  /*
     Handle HTTP errors.
  */
  if (!response.ok) {
    throw new Error(
      result?.message ||
        result?.detail ||
        `NLP API returned HTTP ${response.status}.`
    );
  }

  /*
     Empty response.
  */
  if (!result) {
    throw new Error(
      "The NLP API returned an empty response."
    );
  }

  return result;
}


/* =========================================================
   BADGES
   ========================================================= */

function RiskBadge({
  level,
}) {
  const value =
    level || "Unknown";

  return (
    <span
      className={`badge risk-badge ${getRiskClass(
        value
      )}`}
    >
      {value}
    </span>
  );
}


function SentimentBadge({
  sentiment,
}) {
  const value =
    sentiment || "Unknown";

  return (
    <span
      className={`badge sentiment-badge ${getSentimentClass(
        value
      )}`}
    >
      {value}
    </span>
  );
}


/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyState({
  message,
}) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}


/* =========================================================
   METRIC CARD
   ========================================================= */

function MetricCard({
  label,
  value,
  description,
}) {
  return (
    <div className="metric-card">

      <span className="metric-label">
        {label}
      </span>

      <strong className="metric-value">
        {value}
      </strong>

      {description && (
        <span className="metric-description">
          {description}
        </span>
      )}

    </div>
  );
}


/* =========================================================
   SECTION HEADER
   ========================================================= */

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <div className="section-header">

      <div>

        <h3>
          {title}
        </h3>

        {subtitle && (
          <p>
            {subtitle}
          </p>
        )}

      </div>

    </div>
  );
}


/* =========================================================
   ARTICLE CARD
   ========================================================= */

function ArticleCard({
  article,
  showRisk = true,
}) {
  if (!article) {
    return null;
  }

  const title =
    getArticleTitle(
      article
    );

  const source =
    getArticleSource(
      article
    );

  const summary =
    getArticleSummary(
      article
    );

  const sentiment =
    article?.sentiment ||
    article?.overall_sentiment ||
    "Unknown";

  const riskLevel =
    article?.risk_level ||
    article?.risk ||
    "Low";

  const publishedDate =
    getArticleDate(
      article
    );

  const articleUrl =
    getArticleUrl(
      article
    );

  return (
    <article className="article-card">

      <div className="article-top-row">

        <span className="article-source">
          {source}
        </span>

        <div className="article-badges">

          <SentimentBadge
            sentiment={
              sentiment
            }
          />

          {showRisk && (
            <RiskBadge
              level={
                riskLevel
              }
            />
          )}

        </div>

      </div>


      <h4 className="article-title">
        {title}
      </h4>


      <p className="article-summary">
        {summary}
      </p>


      <div className="article-bottom-row">

        <span className="article-date">
          {formatDate(
            publishedDate
          )}
        </span>

        {articleUrl && (
          <a
            href={articleUrl}
            target="_blank"
            rel="noreferrer"
            className="article-link"
          >
            Read article →
          </a>
        )}

      </div>

    </article>
  );
}


/* =========================================================
   SENTIMENT CHART
   ========================================================= */

function SentimentChart({
  portfolioSummary,
}) {
  const sentimentCounts =
    portfolioSummary
      ?.sentiment_counts ||
    portfolioSummary
      ?.sentiment_distribution ||
    {};

  const positive =
    safeNumber(
      sentimentCounts
        ?.positive
    );

  const neutral =
    safeNumber(
      sentimentCounts
        ?.neutral
    );

  const negative =
    safeNumber(
      sentimentCounts
        ?.negative
    );

  const total =
    positive +
    neutral +
    negative;

  if (total === 0) {
    return (
      <EmptyState
        message="No sentiment data available."
      />
    );
  }

  return (
    <div className="sentiment-chart">

      <div className="sentiment-bar">

        {positive > 0 && (
          <div
            className="sentiment-segment positive"
            style={{
              width: `${
                (positive / total) *
                100
              }%`,
            }}
          />
        )}

        {neutral > 0 && (
          <div
            className="sentiment-segment neutral"
            style={{
              width: `${
                (neutral / total) *
                100
              }%`,
            }}
          />
        )}

        {negative > 0 && (
          <div
            className="sentiment-segment negative"
            style={{
              width: `${
                (negative / total) *
                100
              }%`,
            }}
          />
        )}

      </div>


      <div className="chart-legend">

        <div>
          <span className="legend-dot positive" />
          <span>Positive</span>
          <strong>
            {positive}
          </strong>
        </div>


        <div>
          <span className="legend-dot neutral" />
          <span>Neutral</span>
          <strong>
            {neutral}
          </strong>
        </div>


        <div>
          <span className="legend-dot negative" />
          <span>Negative</span>
          <strong>
            {negative}
          </strong>
        </div>

      </div>

    </div>
  );
}


/* =========================================================
   NEWS FRESHNESS
   ========================================================= */

function FreshnessChart({
  companySummaries,
}) {
  const freshness =
    useMemo(() => {

      const result = {
        fresh: 0,
        recent: 0,
        old: 0,
        unknown: 0,
      };

      companySummaries.forEach(
        (company) => {

          const articles =
            Array.isArray(
              company?.articles
            )
              ? company.articles
              : [];

          articles.forEach(
            (article) => {

              const dateValue =
                getArticleDate(
                  article
                );

              if (!dateValue) {
                result.unknown += 1;
                return;
              }

              const date =
                new Date(
                  dateValue
                );

              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {
                result.unknown += 1;
                return;
              }

              const ageHours =
                (
                  Date.now() -
                  date.getTime()
                ) /
                (1000 * 60 * 60);

              /*
                 Future-dated article:
                 treat as fresh rather than
                 displaying negative age.
              */
              if (
                ageHours <= 24
              ) {
                result.fresh += 1;
              } else if (
                ageHours <= 72
              ) {
                result.recent += 1;
              } else {
                result.old += 1;
              }

            }
          );

        }
      );

      return result;

    }, [companySummaries]);


  const total =
    freshness.fresh +
    freshness.recent +
    freshness.old +
    freshness.unknown;


  if (total === 0) {
    return (
      <EmptyState
        message="No freshness information available."
      />
    );
  }


  return (
    <div className="freshness-list">

      <div className="freshness-row">

        <span>
          Last 24 hours
        </span>

        <strong>
          {freshness.fresh}
        </strong>

      </div>


      <div className="freshness-row">

        <span>
          1–3 days
        </span>

        <strong>
          {freshness.recent}
        </strong>

      </div>


      <div className="freshness-row">

        <span>
          Older
        </span>

        <strong>
          {freshness.old}
        </strong>

      </div>


      {freshness.unknown > 0 && (
        <div className="freshness-row">

          <span>
            Unknown
          </span>

          <strong>
            {freshness.unknown}
          </strong>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   COMPANY RISK TABLE
   ========================================================= */

function CompanyRiskTable({
  companies,
}) {
  if (!companies.length) {
    return (
      <EmptyState
        message="No company risk information available."
      />
    );
  }


  return (
    <div className="table-wrapper">

      <table className="company-risk-table">

        <thead>

          <tr>

            <th>
              Company
            </th>

            <th>
              Articles
            </th>

            <th>
              Sentiment
            </th>

            <th>
              Risk Contribution
            </th>

            <th>
              Risk Score
            </th>

            <th>
              Risk Level
            </th>

          </tr>

        </thead>


        <tbody>

          {companies.map(
            (
              company,
              index
            ) => {

              const companyName =
                company?.company_name ||
                company?.name ||
                company?.symbol ||
                "Unknown";


              const articleCount =
                safeNumber(
                  company?.article_count,
                  Array.isArray(
                    company?.articles
                  )
                    ? company.articles.length
                    : 0
                );


              const sentiment =
                company?.overall_sentiment ||
                company?.sentiment ||
                "Unknown";


              const riskContribution =
                company?.risk_contribution ??
                company?.risk_points ??
                company?.risk_contribution_score ??
                0;


              const riskScore =
                company?.risk_score ??
                company?.score ??
                0;


              const riskLevel =
                company?.risk_level ||
                company?.risk ||
                "Low";


              return (
                <tr
                  key={
                    `${
                      company?.symbol ||
                      companyName
                    }-${index}`
                  }
                >

                  <td>

                    <div className="company-name">
                      {companyName}
                    </div>

                    {company?.symbol && (
                      <small>
                        {company.symbol}
                      </small>
                    )}

                  </td>


                  <td>
                    {articleCount}
                  </td>


                  <td>

                    <SentimentBadge
                      sentiment={
                        sentiment
                      }
                    />

                  </td>


                  <td>
                    {formatNumber(
                      riskContribution,
                      0
                    )}
                  </td>


                  <td>
                    {formatNumber(
                      riskScore,
                      2
                    )}
                  </td>


                  <td>

                    <RiskBadge
                      level={
                        riskLevel
                      }
                    />

                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function NLPIntelligence() {

  /* =======================================================
     SYMBOL INPUT
     ======================================================= */

  /*
     What the user is currently typing.
  */
  const [
    symbolInput,
    setSymbolInput,
  ] = useState(
    DEFAULT_SYMBOLS.join(", ")
  );


  /*
     Symbols actually applied to the API.
  */
  const [
    symbols,
    setSymbols,
  ] = useState(
    DEFAULT_SYMBOLS
  );


  /* =======================================================
     ARTICLE COUNT INPUT
     ======================================================= */

  /*
     Keep the typed value separate from
     the applied API value.

     This prevents requests such as:

     2
     20

     from causing unnecessary API calls
     while the user types.
  */
  const [
    articleCountInput,
    setArticleCountInput,
  ] = useState(
    String(
      DEFAULT_ARTICLE_COUNT
    )
  );


  /*
     Actual article count used by API.
  */
  const [
    articleCount,
    setArticleCount,
  ] = useState(
    DEFAULT_ARTICLE_COUNT
  );


  /* =======================================================
     API DATA
     ======================================================= */

  const [
    data,
    setData,
  ] = useState(null);


  /* =======================================================
     LOADING STATES
     ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  /* =======================================================
     ERROR STATE
     ======================================================= */

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     LAST UPDATED
     ======================================================= */

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);


  /* =======================================================
     REQUEST CONTROLLER
     ======================================================= */

  /*
     Keeps track of the latest request.

     If the user changes:

     RELIANCE
        ↓
     TCS
        ↓
     INFY

     an older request cannot overwrite
     the newest request.
  */
  const abortControllerRef =
    useRef(null);


  /* =======================================================
     REQUEST ID
     ======================================================= */

  /*
     Extra protection against race conditions.

     Every request gets a unique ID.
  */
  const requestIdRef =
    useRef(0);


  /* =======================================================
     NORMALIZED INPUTS
     ======================================================= */

  const normalizedSymbols =
    useMemo(
      () =>
        normalizeSymbols(
          symbols
        ),
      [symbols]
    );


  const safeArticleCount =
    useMemo(
      () =>
        normalizeArticleCount(
          articleCount
        ),
      [articleCount]
    );


  const symbolQuery =
    useMemo(
      () =>
        normalizedSymbols.join(
          ", "
        ),
      [normalizedSymbols]
    );


  /* =======================================================
     FETCH NLP DATA
     ======================================================= */

  const fetchNLPData =
    useCallback(
      async (
        isRefresh = false
      ) => {

        /*
           Cancel previous request.
        */
        if (
          abortControllerRef
            .current
        ) {
          abortControllerRef.current.abort();
        }


        const controller =
          new AbortController();


        abortControllerRef.current =
          controller;


        /*
           Generate a unique request ID.
        */
        const requestId =
          ++requestIdRef.current;


        /* -------------------------------------------------
           LOADING STATE
           ------------------------------------------------- */

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }


        setError("");


        /* -------------------------------------------------
           BUILD URL
           ------------------------------------------------- */

        const url =
          buildPortfolioNewsUrl(
            normalizedSymbols,
            safeArticleCount
          );


        /* -------------------------------------------------
           DEBUG INFORMATION
           ------------------------------------------------- */

        console.log(
          "========================================"
        );

        console.log(
          "[QuantRisk AI] NLP REQUEST"
        );

        console.log(
          "Request ID:",
          requestId
        );

        console.log(
          "URL:",
          url
        );

        console.log(
          "Symbols:",
          normalizedSymbols
        );

        console.log(
          "Article count:",
          safeArticleCount
        );

        console.log(
          "========================================"
        );


        /* -------------------------------------------------
           API REQUEST
           ------------------------------------------------- */

        try {

          const result =
            await fetchJson(
              url,
              {
                signal:
                  controller.signal,
              }
            );


          /*
             Ignore the result if this is
             no longer the newest request.
          */
          if (
            requestId !==
            requestIdRef.current
          ) {
            console.log(
              "[QuantRisk AI] Ignoring stale response:",
              requestId
            );

            return;
          }


          console.log(
            "[QuantRisk AI] NLP RESPONSE:",
            result
          );


          /* -------------------------------------------------
             API STATUS
             ------------------------------------------------- */

          if (
            !result ||
            result.status !==
              "success"
          ) {

            throw new Error(
              result?.message ||
                "The NLP API returned an unsuccessful response."
            );
          }


          /* -------------------------------------------------
             NORMALIZE RESPONSE
             ------------------------------------------------- */

          const normalizedData = {

            portfolio_summary:
              result.portfolio_summary ||
              {},


            company_summaries:
              Array.isArray(
                result.company_summaries
              )
                ? result.company_summaries
                : [],


            top_risk_articles:
              Array.isArray(
                result.top_risk_articles
              )
                ? result.top_risk_articles
                : [],


            top_positive_articles:
              Array.isArray(
                result.top_positive_articles
              )
                ? result.top_positive_articles
                : [],


            collection_errors:
              Array.isArray(
                result.collection_errors
              )
                ? result.collection_errors
                : [],


            /*
               These fields are useful for verifying
               that FastAPI actually processed the
               requested inputs.
            */
            requested_symbols:
              Array.isArray(
                result.requested_symbols
              )
                ? result.requested_symbols
                : normalizedSymbols,


            requested_article_count:
              safeNumber(
                result.requested_article_count,
                safeArticleCount
              ),

          };


          /* -------------------------------------------------
             UPDATE DATA
             ------------------------------------------------- */

          setData(
            normalizedData
          );


          /*
             Record successful update time.
          */
          setLastUpdated(
            new Date()
          );


          console.log(
            "[QuantRisk AI] NLP DATA UPDATED"
          );

          console.log(
            "Companies:",
            normalizedData
              .company_summaries
              .length
          );

          console.log(
            "Risk articles:",
            normalizedData
              .top_risk_articles
              .length
          );

          console.log(
            "Positive articles:",
            normalizedData
              .top_positive_articles
              .length
          );

        } catch (requestError) {

          /* -------------------------------------------------
             CANCELLED REQUEST
             ------------------------------------------------- */

          if (
            requestError?.name ===
            "AbortError"
          ) {

            console.log(
              "[QuantRisk AI] Previous request cancelled."
            );

            return;
          }


          /* -------------------------------------------------
             STALE REQUEST
             ------------------------------------------------- */

          if (
            requestId !==
            requestIdRef.current
          ) {

            console.log(
              "[QuantRisk AI] Ignoring stale request error."
            );

            return;
          }


          /* -------------------------------------------------
             REAL ERROR
             ------------------------------------------------- */

          console.error(
            "[QuantRisk AI] NLP REQUEST FAILED:",
            requestError
          );


          setError(
            requestError?.message ||
              "Unable to load NLP Intelligence."
          );

        } finally {

          /*
             Only the current request can
             modify loading state.
          */
          if (
            requestId ===
            requestIdRef.current
          ) {

            if (
              abortControllerRef
                .current ===
              controller
            ) {

              abortControllerRef.current =
                null;
            }


            setLoading(false);

            setRefreshing(false);
          }

        }

      },
      [
        normalizedSymbols,
        safeArticleCount,
      ]
    );


  /* =======================================================
     INITIAL LOAD + AUTO REFRESH
     ======================================================= */

  useEffect(() => {

    /*
       Initial request.
    */
    fetchNLPData(false);


    /*
       Refresh every 5 minutes.
    */
    const interval =
      window.setInterval(
        () => {
          fetchNLPData(true);
        },
        REFRESH_INTERVAL
      );


    /*
       Cleanup.
    */
    return () => {

      window.clearInterval(
        interval
      );


      if (
        abortControllerRef
          .current
      ) {
        abortControllerRef.current.abort();
      }

    };

  }, [fetchNLPData]);


  /* =======================================================
     APPLY SYMBOLS
     ======================================================= */

  function handleApplySymbols() {

    const nextSymbols =
      normalizeSymbols(
        symbolInput
      );


    /*
       Update the API symbols.

       Because fetchNLPData depends on
       normalizedSymbols, this causes
       the effect to execute again.
    */
    setSymbols(
      nextSymbols
    );


    /*
       Keep the input visually normalized.
    */
    setSymbolInput(
      nextSymbols.join(
        ", "
      )
    );

  }


  /* =======================================================
     APPLY ARTICLE COUNT
     ======================================================= */

  function applyArticleCount() {

    const nextCount =
      normalizeArticleCount(
        articleCountInput
      );


    /*
       Update displayed input.
    */
    setArticleCountInput(
      String(nextCount)
    );


    /*
       Update actual API value.
    */
    setArticleCount(
      nextCount
    );

  }


  /* =======================================================
     ARTICLE COUNT KEYBOARD HANDLER
     ======================================================= */

  function handleArticleCountKeyDown(
    event
  ) {
    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      applyArticleCount();

    }
  }


  /* =======================================================
     SYMBOL KEYBOARD HANDLER
     ======================================================= */

  function handleSymbolKeyDown(
    event
  ) {
    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      handleApplySymbols();

    }
  }


  /* =======================================================
     DATA VARIABLES
     ======================================================= */

  const portfolioSummary =
    data?.portfolio_summary ||
    {};


  const companySummaries =
    Array.isArray(
      data?.company_summaries
    )
      ? data.company_summaries
      : [];


  const topRiskArticles =
    Array.isArray(
      data?.top_risk_articles
    )
      ? data.top_risk_articles
      : [];


  const topPositiveArticles =
    Array.isArray(
      data?.top_positive_articles
    )
      ? data.top_positive_articles
      : [];


  const collectionErrors =
    Array.isArray(
      data?.collection_errors
    )
      ? data.collection_errors
      : [];


  /* =======================================================
     CALCULATED ARTICLE COUNT
     ======================================================= */

  /*
     Calculate the number of articles from
     the CURRENT company data.

     This helps prevent the dashboard from
     displaying a stale portfolio count.
  */
  const calculatedArticleCount =
    useMemo(() => {

      return companySummaries.reduce(
        (
          total,
          company
        ) => {

          const count =
            safeNumber(
              company?.article_count,
              Array.isArray(
                company?.articles
              )
                ? company.articles.length
                : 0
            );

          return (
            total + count
          );

        },
        0
      );

    }, [companySummaries]);


  /* =======================================================
     INITIAL LOADING SCREEN
     ======================================================= */

  if (
    loading &&
    !data
  ) {

    return (
      <div className="nlp-page">

        <div className="nlp-loading">

          <div className="loading-spinner" />

          <h2>
            Loading NLP Intelligence
          </h2>

          <p>
            Collecting and analyzing
            financial news...
          </p>

          <small className="loading-endpoint">
            Connecting through Vite proxy
          </small>

        </div>

      </div>
    );
  }


  /* =======================================================
     INITIAL ERROR SCREEN
     ======================================================= */

  if (
    error &&
    !data
  ) {

    return (
      <div className="nlp-page">

        <div className="nlp-error">

          <div className="error-icon">
            !
          </div>


          <h2>
            Unable to load NLP Intelligence
          </h2>


          <p className="error-message">
            {error}
          </p>


          <div className="error-help">

            <strong>
              Step 1 — Test Vite proxy
            </strong>

            <code>
              http://127.0.0.1:5173/api/nlp/health
            </code>


            <strong>
              Step 2 — Test FastAPI directly
            </strong>

            <code>
              http://127.0.0.1:8000/api/nlp/health
            </code>

          </div>


          <div className="error-actions">

            <button
              className="primary-button"
              onClick={() =>
                fetchNLPData(false)
              }
            >
              Retry
            </button>


            <button
              className="secondary-button"
              onClick={() =>
                window.location.reload()
              }
            >
              Reload Page
            </button>

          </div>

        </div>
      </div>
    );
  }


  /* =======================================================
     MAIN PAGE
     ======================================================= */

  return (
    <div className="nlp-page">

      {/* ===================================================
          REFRESH INDICATOR
          =================================================== */}

      {refreshing && (
        <div className="refresh-overlay">

          <div className="refresh-indicator">

            <div className="loading-spinner" />

            <div>

              <strong>
                Updating NLP Intelligence
              </strong>

              <span>
                Collecting fresh financial news
                and recalculating portfolio signals...
              </span>

            </div>

          </div>

        </div>
      )}


      {/* ===================================================
          PAGE HEADER
          =================================================== */}

      <div className="nlp-page-header">

        <div className="nlp-header-text">

          <span className="page-kicker">
            AI-POWERED FINANCIAL NLP
          </span>


          <h1>
            NLP Intelligence
          </h1>


          <p>
            Real-time financial news
            analysis, sentiment intelligence
            and portfolio risk signals.
          </p>

        </div>


        <button
          className="refresh-button"
          onClick={() =>
            fetchNLPData(true)
          }
          disabled={refreshing}
        >

          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}

        </button>

      </div>


      {/* ===================================================
          CONTROLS
          =================================================== */}

      <div className="nlp-controls">

        {/* -----------------------------------------------
            SYMBOL CONTROL
            ----------------------------------------------- */}

        <div className="control-group symbol-control">

          <label>
            Portfolio Symbols
          </label>


          <div className="symbol-input-row">

            <input
              type="text"
              value={
                symbolInput
              }
              onChange={(event) =>
                setSymbolInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleSymbolKeyDown
              }
              placeholder="RELIANCE.NS, TCS.NS, INFY.NS"
              disabled={refreshing}
            />


            <button
              className="apply-button"
              onClick={
                handleApplySymbols
              }
              disabled={
                refreshing
              }
            >
              Apply
            </button>

          </div>

        </div>


        {/* -----------------------------------------------
            ARTICLE COUNT CONTROL
            ----------------------------------------------- */}

        <div className="control-group small-control">

          <label>
            Articles / Company
          </label>


          <input
            type="number"
            min={
              MIN_ARTICLE_COUNT
            }
            max={
              MAX_ARTICLE_COUNT
            }
            value={
              articleCountInput
            }
            onChange={(event) =>
              setArticleCountInput(
                event.target.value
              )
            }
            onBlur={
              applyArticleCount
            }
            onKeyDown={
              handleArticleCountKeyDown
            }
            disabled={
              refreshing
            }
          />

        </div>

      </div>


      {/* ===================================================
          CURRENT MONITORING INFO
          =================================================== */}

      <div className="monitoring-strip">

        <span>

          Monitoring:

          <strong>
            {" "}
            {symbolQuery}
          </strong>

        </span>


        <span>
          {safeArticleCount}
          {" "}
          articles/company
        </span>


        <span>
          Auto-refresh: 5 minutes
        </span>


        {refreshing && (
          <span className="refresh-status">
            Updating NLP intelligence...
          </span>
        )}

      </div>


      {/* ===================================================
          REFRESH ERROR
          =================================================== */}

      {error && data && (
        <div className="inline-error">

          <strong>
            Refresh failed:
          </strong>

          {" "}

          {error}


          <button
            onClick={() =>
              fetchNLPData(true)
            }
          >
            Retry
          </button>

        </div>
      )}


      {/* ===================================================
          METRICS
          =================================================== */}

      <div className="metrics-grid">

        <MetricCard
          label="Total Articles"
          value={
            calculatedArticleCount ||
            portfolioSummary
              .total_articles ||
            portfolioSummary
              .article_count ||
            0
          }
          description="Articles analyzed across the current portfolio"
        />


        <MetricCard
          label="Overall Sentiment"
          value={
            portfolioSummary
              .overall_sentiment ||
            "Unknown"
          }
          description={
            `Score: ${formatNumber(
              portfolioSummary
                .sentiment_score,
              3
            )}`
          }
        />


        <MetricCard
          label="Portfolio Risk Score"
          value={
            formatNumber(
              portfolioSummary
                .portfolio_risk_score ??
                portfolioSummary
                  .risk_score,
              2
            )
          }
          description="NLP-derived risk signal"
        />


        <MetricCard
          label="Risk Level"
          value={
            portfolioSummary
              .risk_level ||
            "Unknown"
          }
          description="Current portfolio signal"
        />

      </div>


      {/* ===================================================
          SENTIMENT + FRESHNESS
          =================================================== */}

      <div className="nlp-two-column">

        {/* -----------------------------------------------
            SENTIMENT
            ----------------------------------------------- */}

        <section className="nlp-panel">

          <SectionHeader
            title="Portfolio Sentiment"
            subtitle="Sentiment distribution across analyzed news"
          />


          <SentimentChart
            portfolioSummary={
              portfolioSummary
            }
          />

        </section>


        {/* -----------------------------------------------
            FRESHNESS
            ----------------------------------------------- */}

        <section className="nlp-panel">

          <SectionHeader
            title="News Freshness"
            subtitle="How recent the collected articles are"
          />


          <FreshnessChart
            companySummaries={
              companySummaries
            }
          />

        </section>

      </div>


      {/* ===================================================
          COMPANY RISK INTELLIGENCE
          =================================================== */}

      <section className="nlp-panel">

        <SectionHeader
          title="Company Risk Intelligence"
          subtitle="NLP-derived sentiment and risk contribution by portfolio company"
        />


        <CompanyRiskTable
          companies={
            companySummaries
          }

        />

      </section>


      {/* ===================================================
          COLLECTION WARNINGS
          =================================================== */}

      {collectionErrors.length > 0 && (

        <section className="nlp-panel warning-panel">

          <SectionHeader
            title="Collection Warnings"
            subtitle="Some portfolio symbols could not be processed"
          />


          <div className="warning-list">

            {collectionErrors.map(
              (
                item,
                index
              ) => (

                <div
                  className="warning-item"
                  key={
                    `${
                      item?.symbol ||
                      "error"
                    }-${index}`
                  }
                >

                  <strong>
                    {item?.symbol ||
                      "Unknown symbol"}
                  </strong>


                  <span>
                    {item?.message ||
                      "Unable to collect news."}
                  </span>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* ===================================================
          TOP RISK SIGNALS
          =================================================== */}

      <section className="nlp-panel">

        <SectionHeader
          title="Top Risk Signals"
          subtitle="Articles contributing to portfolio risk intelligence"
        />


        {topRiskArticles.length > 0 ? (

          <div className="article-grid">

            {topRiskArticles.map(
              (
                article,
                index
              ) => (

                <ArticleCard
                  key={
                    article?.id ||
                    article?.url ||
                    article?.article_url ||
                    `risk-${index}`
                  }
                  article={
                    article
                  }
                  showRisk={
                    true
                  }
                />

              )
            )}

          </div>

        ) : (

          <EmptyState
            message="No significant risk articles found."
          />

        )}

      </section>


      {/* ===================================================
          POSITIVE INTELLIGENCE
          =================================================== */}

      <section className="nlp-panel">

        <SectionHeader
          title="Positive Intelligence"
          subtitle="Positive financial news detected across the portfolio"
        />


        {topPositiveArticles.length > 0 ? (

          <div className="article-grid">

            {topPositiveArticles.map(
              (
                article,
                index
              ) => (

                <ArticleCard
                  key={
                    article?.id ||
                    article?.url ||
                    article?.article_url ||
                    `positive-${index}`
                  }
                  article={
                    article
                  }
                  showRisk={
                    false
                  }
                />

              )
            )}

          </div>

        ) : (

          <EmptyState
            message="No positive articles found."
          />

        )}

      </section>


      {/* ===================================================
          NLP PIPELINE
          =================================================== */}

      <section className="nlp-panel">

        <SectionHeader
          title="NLP Intelligence Pipeline"
          subtitle="How QuantRisk AI converts financial news into portfolio intelligence"
        />


        <div className="pipeline">

          <div className="pipeline-step">

            <span>
              01
            </span>

            <strong>
              News Collection
            </strong>

            <p>
              Collect financial news
              for portfolio companies.
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>
              02
            </span>

            <strong>
              FinBERT Sentiment
            </strong>

            <p>
              Analyze positive, neutral
              and negative financial
              sentiment.
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>
              03
            </span>

            <strong>
              Entity &amp; Topic Detection
            </strong>

            <p>
              Identify companies,
              entities, topics and
              relevant signals.
            </p>

          </div>


          <div className="pipeline-arrow">
            →
          </div>


          <div className="pipeline-step">

            <span>
              04
            </span>

            <strong>
              Risk Intelligence
            </strong>

            <p>
              Convert NLP signals
              into portfolio risk
              intelligence.
            </p>

          </div>

        </div>

      </section>


      {/* ===================================================
          FOOTER
          =================================================== */}

      <div className="nlp-footer">

        <span>

          <span className="online-dot" />

          NLP service: Online

        </span>


        <span>

          Last updated:

          {" "}

          {formatDate(
            lastUpdated
          )}

        </span>


        <span>

          Monitoring:

          {" "}

          {symbolQuery}

        </span>

      </div>

    </div>
  );
}

