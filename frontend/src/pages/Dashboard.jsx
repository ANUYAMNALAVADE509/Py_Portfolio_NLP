import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Wifi,
  XCircle,
} from "lucide-react";

import "./Dashboard.css";


const API = {
  market: "/api/market",
  risk: "/api/risk",
};


const REFRESH_INTERVAL = 60 * 1000;


// ============================================================
// FORMATTERS
// ============================================================

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function formatINR(value) {
  const number = numberValue(value);

  if (number === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(number);
}


function formatNumber(value, digits = 2) {
  const number = numberValue(value);

  if (number === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }
  ).format(number);
}


function formatPercent(value, digits = 2) {
  const number = numberValue(value);

  if (number === null) {
    return "—";
  }

  return `${number.toFixed(digits)}%`;
}


function formatModelPercent(value) {
  const number = numberValue(value);

  if (number === null) {
    return "—";
  }

  return `${(number * 100).toFixed(2)}%`;
}


function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}


function formatVolume(value) {
  const number = numberValue(value);

  if (number === null) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  ).format(number);
}


function getRowValue(row, keys) {
  for (const key of keys) {
    if (
      row &&
      row[key] !== undefined &&
      row[key] !== null
    ) {
      return row[key];
    }
  }

  return null;
}


// ============================================================
// GENERIC API
// ============================================================

async function getJSON(
  url,
  options = {}
) {
  const response = await fetch(
    url,
    {
      cache: "no-store",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {
    let detail = "";

    try {
      const body = await response.json();

      detail =
        body?.detail ||
        body?.message ||
        "";
    } catch {
      // Ignore invalid error bodies.
    }

    throw new Error(
      detail ||
      `Request failed: ${response.status}`
    );
  }

  return response.json();
}


// ============================================================
// COMPONENT
// ============================================================

export default function Dashboard() {

  const [
    marketData,
    setMarketData
  ] = useState(null);

  const [
    portfolioComparison,
    setPortfolioComparison
  ] = useState([]);

  const [
    portfolioWeights,
    setPortfolioWeights
  ] = useState([]);

  const [
    stressSummary,
    setStressSummary
  ] = useState([]);

  const [
    marketLoading,
    setMarketLoading
  ] = useState(true);

  const [
    modelLoading,
    setModelLoading
  ] = useState(true);

  const [
    marketError,
    setMarketError
  ] = useState("");

  const [
    modelError,
    setModelError
  ] = useState("");

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    lastRefresh,
    setLastRefresh
  ] = useState(null);


  // ==========================================================
  // MARKET
  // ==========================================================

  const loadMarket = useCallback(
    async (
      forceRefresh = false
    ) => {

      setMarketLoading(true);
      setMarketError("");

      try {

        const cacheParam = forceRefresh
          ? `?refresh=true&_=${Date.now()}`
          : "";

        const data = await getJSON(
          `${API.market}/snapshot${cacheParam}`
        );

        if (
          !data ||
          !Array.isArray(data.quotes)
        ) {
          throw new Error(
            "Market service returned an invalid response."
          );
        }

        const validQuotes =
          data.quotes.filter(
            (quote) =>
              quote &&
              quote.symbol &&
              numberValue(quote.price) !== null
          );

        setMarketData({
          ...data,
          quotes: validQuotes,
        });

        setLastRefresh(
          new Date()
        );

      } catch (error) {

        console.error(
          "Market data error:",
          error
        );

        setMarketData(null);

        setMarketError(
          error?.message ||
          "Unable to retrieve market data."
        );

      } finally {

        setMarketLoading(false);
      }

    },
    []
  );


  // ==========================================================
  // TEAM MODEL OUTPUTS
  // ==========================================================

  const loadModels = useCallback(
    async () => {

      setModelLoading(true);
      setModelError("");

      const requests = await Promise.allSettled([
        getJSON(
          `${API.risk}/portfolio-comparison`
        ),

        getJSON(
          `${API.risk}/portfolio-weights`
        ),

        getJSON(
          `${API.risk}/stress-summary`
        ),
      ]);


      const [
        comparisonResult,
        weightsResult,
        stressResult,
      ] = requests;


      let successful = false;


      if (
        comparisonResult.status === "fulfilled"
      ) {

        setPortfolioComparison(
          Array.isArray(
            comparisonResult.value?.data
          )
            ? comparisonResult.value.data
            : []
        );

        successful = true;

      } else {

        setPortfolioComparison([]);
      }


      if (
        weightsResult.status === "fulfilled"
      ) {

        setPortfolioWeights(
          Array.isArray(
            weightsResult.value?.data
          )
            ? weightsResult.value.data
            : []
        );

        successful = true;

      } else {

        setPortfolioWeights([]);
      }


      if (
        stressResult.status === "fulfilled"
      ) {

        setStressSummary(
          Array.isArray(
            stressResult.value?.data
          )
            ? stressResult.value.data
            : []
        );

        successful = true;

      } else {

        setStressSummary([]);
      }


      if (!successful) {

        setModelError(
          "The portfolio model endpoints could not be loaded."
        );

      }

      setModelLoading(false);

    },
    []
  );


  // ==========================================================
  // LOAD EVERYTHING
  // ==========================================================

  const refreshAll = useCallback(
    async () => {

      setRefreshing(true);

      await Promise.allSettled([
        loadMarket(true),
        loadModels(),
      ]);

      setRefreshing(false);

    },
    [
      loadMarket,
      loadModels,
    ]
  );


  useEffect(() => {

    loadMarket(false);
    loadModels();

    const timer =
      window.setInterval(
        () => {
          loadMarket(true);
        },
        REFRESH_INTERVAL
      );

    return () => {
      window.clearInterval(timer);
    };

  }, [
    loadMarket,
    loadModels,
  ]);


  // ==========================================================
  // MARKET METRICS
  // ==========================================================

  const marketQuotes =
    marketData?.quotes || [];


  const advancing =
    marketData?.advancing ??
    marketQuotes.filter(
      (item) =>
        numberValue(item.change) > 0
    ).length;


  const declining =
    marketData?.declining ??
    marketQuotes.filter(
      (item) =>
        numberValue(item.change) < 0
    ).length;


  const unchanged =
    marketData?.unchanged ??
    marketQuotes.filter(
      (item) =>
        numberValue(item.change) === 0
    ).length;


  // ==========================================================
  // TOP PORTFOLIO MODEL
  // ==========================================================

  const bestPortfolio =
    useMemo(() => {

      if (
        !portfolioComparison.length
      ) {
        return null;
      }

      return (
        [...portfolioComparison]
          .sort(
            (a, b) =>
              Number(
                getRowValue(
                  b,
                  [
                    "Sharpe_Ratio",
                    "Sharpe Ratio",
                    "Sharpe",
                  ]
                )
              ) -
              Number(
                getRowValue(
                  a,
                  [
                    "Sharpe_Ratio",
                    "Sharpe Ratio",
                    "Sharpe",
                  ]
                )
              )
          )[0]
      );

    }, [
      portfolioComparison,
    ]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="dashboard-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <section className="dashboard-header">

        <div>

          <div className="dashboard-eyebrow">
            QUANTRISK AI · PORTFOLIO INTELLIGENCE
          </div>

          <h1>
            Dashboard &amp; Portfolio
          </h1>

          <p>
            Current market information,
            portfolio optimisation results
            and quantitative risk outputs.
          </p>

        </div>


        <button
          className="refresh-button"
          onClick={refreshAll}
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Data"}

        </button>

      </section>


      {/* ====================================================
          MARKET STATUS
      ==================================================== */}

      <section className="market-overview">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              MARKET OVERVIEW
            </div>

            <h2>
              Indian Equity Market
            </h2>

            <p>
              Latest available prices and
              session movement for the
              monitored portfolio universe.
            </p>

          </div>


          <div
            className={
              marketData?.status === "available"
                ? "feed-status live"
                : "feed-status offline"
            }
          >

            {marketData?.status === "available" ? (
              <>
                <Wifi size={15} />
                Data available
              </>
            ) : (
              <>
                <XCircle size={15} />
                Data unavailable
              </>
            )}

          </div>

        </div>


        {marketLoading ? (

          <div className="market-loading">
            <RefreshCw
              size={20}
              className="spin"
            />

            <span>
              Fetching latest market data...
            </span>
          </div>

        ) : marketError ? (

          <div className="market-error">

            <AlertTriangle
              size={20}
            />

            <div>

              <strong>
                Market data could not be retrieved
              </strong>

              <span>
                {marketError}
              </span>

            </div>

          </div>

        ) : marketQuotes.length === 0 ? (

          <div className="market-error">

            <AlertTriangle
              size={20}
            />

            <div>

              <strong>
                No valid market quotes returned
              </strong>

              <span>
                No artificial values are displayed.
              </span>

            </div>

          </div>

        ) : (

          <>

            <div className="market-summary">

              <div className="summary-item">

                <span>
                  Advancing
                </span>

                <strong className="positive">
                  {advancing}
                </strong>

              </div>


              <div className="summary-item">

                <span>
                  Declining
                </span>

                <strong className="negative">
                  {declining}
                </strong>

              </div>


              <div className="summary-item">

                <span>
                  Unchanged
                </span>

                <strong>
                  {unchanged}
                </strong>

              </div>


              <div className="summary-item">

                <span>
                  Last update
                </span>

                <strong>
                  {formatDateTime(
                    marketData?.updated_at
                  )}
                </strong>

              </div>

            </div>


            <div className="market-table-wrapper">

              <table className="market-table">

                <thead>

                  <tr>

                    <th>
                      Company
                    </th>

                    <th>
                      Symbol
                    </th>

                    <th>
                      Current Price
                    </th>

                    <th>
                      Previous Close
                    </th>

                    <th>
                      Change
                    </th>

                    <th>
                      Change %
                    </th>

                    <th>
                      Volume
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {marketQuotes.map(
                    (quote) => {

                      const change =
                        numberValue(
                          quote.change
                        );

                      const positive =
                        change > 0;

                      const negative =
                        change < 0;

                      return (
                        <tr
                          key={
                            quote.ticker ||
                            quote.symbol
                          }
                        >

                          <td>
                            <strong>
                              {quote.company}
                            </strong>
                          </td>

                          <td>
                            <span className="symbol">
                              {quote.symbol}
                            </span>
                          </td>

                          <td className="price-cell">
                            {formatINR(
                              quote.price
                            )}
                          </td>

                          <td>
                            {formatINR(
                              quote.previous_close
                            )}
                          </td>

                          <td
                            className={
                              positive
                                ? "positive"
                                : negative
                                  ? "negative"
                                  : ""
                            }
                          >

                            {change === null
                              ? "—"
                              : `${positive ? "+" : ""}${formatINR(change)}`}

                          </td>

                          <td
                            className={
                              positive
                                ? "positive"
                                : negative
                                  ? "negative"
                                  : ""
                            }
                          >

                            {quote.change_percent ===
                            null
                              ? "—"
                              : `${positive ? "+" : ""}${formatPercent(
                                  quote.change_percent
                                )}`}

                          </td>

                          <td>
                            {formatVolume(
                              quote.volume
                            )}
                          </td>

                        </tr>
                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          </>

        )}

      </section>


      {/* ====================================================
          PORTFOLIO OPTIMISATION
      ==================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              PORTFOLIO OPTIMISATION
            </div>

            <h2>
              Quantitative Portfolio Results
            </h2>

            <p>
              Risk-return characteristics of
              the portfolio strategies.
            </p>

          </div>

          <BriefcaseBusiness
            size={21}
          />

        </div>


        {modelLoading ? (

          <div className="data-state">
            <RefreshCw
              size={18}
              className="spin"
            />

            Loading portfolio results...
          </div>

        ) : portfolioComparison.length === 0 ? (

          <div className="data-state error">
            <XCircle size={18} />
            {modelError ||
              "Portfolio optimisation data is unavailable."}
          </div>

        ) : (

          <>

            <div className="portfolio-grid">

              {portfolioComparison.map(
                (portfolio) => {

                  const name =
                    getRowValue(
                      portfolio,
                      ["Portfolio"]
                    ) ||
                    "Portfolio";


                  const expectedReturn =
                    getRowValue(
                      portfolio,
                      [
                        "Expected_Return",
                        "Expected Return",
                      ]
                    );


                  const volatility =
                    getRowValue(
                      portfolio,
                      ["Volatility"]
                    );


                  const sharpe =
                    getRowValue(
                      portfolio,
                      [
                        "Sharpe_Ratio",
                        "Sharpe Ratio",
                      ]
                    );


                  const activePositions =
                    getRowValue(
                      portfolio,
                      [
                        "Active_Positions",
                        "Active Positions",
                      ]
                    );


                  const isBest =
                    bestPortfolio &&
                    name ===
                      getRowValue(
                        bestPortfolio,
                        ["Portfolio"]
                      );


                  return (
                    <article
                      className={
                        isBest
                          ? "portfolio-card highlighted"
                          : "portfolio-card"
                      }
                      key={name}
                    >

                      <div className="portfolio-card-top">

                        <div>

                          <span className="portfolio-label">
                            Strategy
                          </span>

                          <h3>
                            {name}
                          </h3>

                        </div>

                        {isBest && (
                          <span className="recommended-badge">
                            <Target size={13} />
                            Highest Sharpe
                          </span>
                        )}

                      </div>


                      <div className="portfolio-metrics">

                        <div>

                          <span>
                            Expected Return
                          </span>

                          <strong>
                            {formatModelPercent(
                              expectedReturn
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Volatility
                          </span>

                          <strong>
                            {formatModelPercent(
                              volatility
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Sharpe Ratio
                          </span>

                          <strong>
                            {formatNumber(
                              sharpe,
                              4
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Active Positions
                          </span>

                          <strong>
                            {formatNumber(
                              activePositions,
                              0
                            )}
                          </strong>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </>

        )}

      </section>


      {/* ====================================================
          PORTFOLIO WEIGHTS
      ==================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              PORTFOLIO ALLOCATION
            </div>

            <h2>
              Portfolio Weights
            </h2>

            <p>
              Allocation across the quantitative
              portfolio strategies.
            </p>

          </div>

          <Activity size={21} />

        </div>


        {portfolioWeights.length === 0 ? (

          <div className="data-state">
            <XCircle size={18} />
            Portfolio weight data is unavailable.
          </div>

        ) : (

          <div className="weights-table-wrapper">

            <table className="weights-table">

              <thead>

                <tr>

                  <th>
                    Stock
                  </th>

                  <th>
                    Equal Weight
                  </th>

                  <th>
                    Minimum Volatility
                  </th>

                  <th>
                    Maximum Sharpe
                  </th>

                </tr>

              </thead>


              <tbody>

                {portfolioWeights
                  .slice(0, 15)
                  .map(
                    (row, index) => {

                      const stock =
                        getRowValue(
                          row,
                          ["Stock"]
                        ) ||
                        `Stock ${index + 1}`;


                      return (
                        <tr
                          key={
                            `${stock}-${index}`
                          }
                        >

                          <td>
                            <strong>
                              {stock}
                            </strong>
                          </td>

                          <td>
                            {formatPercent(
                              getRowValue(
                                row,
                                [
                                  "Equal_Weight_Pct",
                                ]
                              )
                            )}
                          </td>

                          <td>
                            {formatPercent(
                              getRowValue(
                                row,
                                [
                                  "Minimum_Volatility_Pct",
                                ]
                              )
                            )}
                          </td>

                          <td>
                            {formatPercent(
                              getRowValue(
                                row,
                                [
                                  "Maximum_Sharpe_Pct",
                                ]
                              )
                            )}
                          </td>

                        </tr>
                      );

                    }
                  )}

              </tbody>

            </table>

            {portfolioWeights.length > 15 && (
              <div className="table-note">
                Showing the 15 highest-priority
                allocation rows from the model output.
              </div>
            )}

          </div>

        )}

      </section>


      {/* ====================================================
          STRESS TESTING
      ==================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              QUANTITATIVE RISK
            </div>

            <h2>
              Stress Testing Results
            </h2>

            <p>
              Scenario results generated by
              the quantitative risk workflow.
            </p>

          </div>

          <ShieldAlert size={21} />

        </div>


        {stressSummary.length === 0 ? (

          <div className="data-state">
            <XCircle size={18} />
            Stress-testing data is unavailable.
          </div>

        ) : (

          <div className="stress-grid">

            {stressSummary
              .slice(0, 6)
              .map(
                (row, index) => {

                  const entries =
                    Object.entries(row);

                  return (
                    <article
                      className="stress-card"
                      key={index}
                    >

                      {entries
                        .slice(0, 5)
                        .map(
                          ([key, value]) => {

                            const numeric =
                              numberValue(
                                value
                              );

                            return (
                              <div
                                className="stress-row"
                                key={key}
                              >

                                <span>
                                  {key
                                    .replace(
                                      /_/g,
                                      " "
                                    )}
                                </span>

                                <strong>
                                  {numeric === null
                                    ? String(
                                        value ?? "—"
                                      )
                                    : formatNumber(
                                        numeric,
                                        4
                                      )}
                                </strong>

                              </div>
                            );

                          }
                        )}

                    </article>
                  );

                }
              )}

          </div>

        )}

      </section>


      {/* ====================================================
          DATA INTEGRITY
      ==================================================== */}

      <section className="data-integrity">

        <div className="section-heading">

          <div>

            <div className="section-kicker">
              DATA INTEGRITY
            </div>

            <h2>
              Data Status
            </h2>

          </div>

          <Clock3 size={21} />

        </div>


        <div className="integrity-grid">

          <div className="integrity-item">

            {marketData?.status ===
            "available" ? (
              <CheckCircle2
                size={18}
                className="positive-icon"
              />
            ) : (
              <XCircle
                size={18}
                className="negative-icon"
              />
            )}

            <div>

              <span>
                Market Data
              </span>

              <strong>
                {marketData?.status ===
                "available"
                  ? `${marketData.available_symbols} of ${marketData.requested_symbols} instruments`
                  : "Unavailable"}
              </strong>

            </div>

          </div>


          <div className="integrity-item">

            {portfolioComparison.length ? (
              <CheckCircle2
                size={18}
                className="positive-icon"
              />
            ) : (
              <XCircle
                size={18}
                className="negative-icon"
              />
            )}

            <div>

              <span>
                Portfolio Models
              </span>

              <strong>
                {portfolioComparison.length
                  ? "Available"
                  : "Unavailable"}
              </strong>

            </div>

          </div>


          <div className="integrity-item">

            {stressSummary.length ? (
              <CheckCircle2
                size={18}
                className="positive-icon"
              />
            ) : (
              <XCircle
                size={18}
                className="negative-icon"
              />
            )}

            <div>

              <span>
                Risk Models
              </span>

              <strong>
                {stressSummary.length
                  ? "Available"
                  : "Unavailable"}
              </strong>

            </div>

          </div>


          <div className="integrity-item">

            <Clock3 size={18} />

            <div>

              <span>
                Last Market Update
              </span>

              <strong>
                {formatDateTime(
                  marketData?.updated_at
                )}
              </strong>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}