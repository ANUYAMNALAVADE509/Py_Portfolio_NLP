import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  Gauge,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  XCircle,
} from "lucide-react";

import { fetchMarketQuote } from "../services/marketService";
import "./RiskAnalysis.css";

const API_BASE = "/api/risk";
const REFRESH_INTERVAL = 60;

const ENDPOINTS = {
  volatilityPredictions: "/volatility-predictions",
  featureImportance: "/feature-importance",
  shapGlobal: "/shap-global",
  limeGlobal: "/lime-global",
  stressSummary: "/stress-summary",
  stressContributors: "/stress-contributors",
};

/* 50 symbols present in the supplied model-universe list. */
const STOCKS = [
  "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
  "BAJAJ-AUTO", "BAJAJFINSV", "BAJFINANCE", "BEL", "BHARTIARTL",
  "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL", "GRASIM",
  "HCLTECH", "HDFCBANK", "HDFCLIFE", "HEROMOTOCO", "HINDALCO",
  "HINDUNILVR", "ICICIBANK", "INDUSINDBK", "INFY", "ITC", "JIOFIN",
  "JSWSTEEL", "KOTAKBANK", "LT", "M&M", "MARUTI", "NESTLEIND", "NTPC",
  "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN", "SHRIRAMFIN",
  "SUNPHARMA", "TATACONSUM", "TATASTEEL", "TCS", "TECHM", "TITAN",
  "TRENT", "ULTRACEMCO", "WIPRO",
];

function getField(row, names, fallback = undefined) {
  if (!row || typeof row !== "object") return fallback;
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
  }
  return fallback;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPercent(value) {
  const number = toNumber(value);
  return number === null ? null : `${(number * 100).toFixed(2)}%`;
}

function formatRawPercent(value) {
  const number = toNumber(value);
  return number === null ? null : `${number.toFixed(2)}%`;
}

function formatNumber(value, decimals = 2) {
  const number = toNumber(value);
  return number === null ? null : number.toFixed(decimals);
}

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function getPredictionSymbol(row) {
  return getField(row, ["Symbol", "symbol", "Stock", "stock", "Ticker", "ticker"], "");
}

function getPredictionDate(row) {
  return getField(row, ["Date", "date", "Datetime", "datetime", "Timestamp", "timestamp"], "");
}

function getActualVolatility(row) {
  return getField(row, ["Actual_Volatility", "actual_volatility", "Actual Volatility", "Actual", "actual"]);
}

function getPredictedVolatility(row) {
  return getField(row, ["Predicted_Volatility", "predicted_volatility", "Predicted Volatility", "Predicted", "predicted"]);
}

function getAbsoluteError(row) {
  return getField(row, ["Absolute_Error", "absolute_error", "Absolute Error", "Error", "error"]);
}

function getScenarioName(row) {
  return getField(row, [
    "Scenario", "scenario", "Scenario_Name", "scenario_name",
    "Scenario Name", "Stress_Scenario", "stress_scenario",
  ], "");
}

function getLossPercentage(row) {
  return getField(row, ["Loss_Percentage", "loss_percentage", "Loss Percentage", "Loss", "loss"]);
}

function getMarketShock(row) {
  return getField(row, [
    "Market_Shock_Pct", "market_shock_pct", "Market Shock Pct",
    "Market_Shock", "market_shock", "Shock", "shock",
  ]);
}

function getContributorSymbol(row) {
  return getField(row, ["Symbol", "symbol", "Stock", "stock", "Ticker", "ticker"], "");
}

function getContributorValue(row) {
  return getField(row, [
    "Contribution_Percentage", "contribution_percentage",
    "Contribution Percentage", "Contribution", "contribution",
    "Loss_Percentage", "loss_percentage",
  ]);
}

function getCurrentISTDate() {
  return new Date();
}

export default function RiskAnalysis() {
  const [volatilityPredictions, setVolatilityPredictions] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [shapGlobal, setShapGlobal] = useState([]);
  const [limeGlobal, setLimeGlobal] = useState([]);
  const [stressSummary, setStressSummary] = useState([]);
  const [stressContributors, setStressContributors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL);

  const [selectedStock, setSelectedStock] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllShap, setShowAllShap] = useState(false);
  const [showAllLime, setShowAllLime] = useState(false);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);

  const [marketQuote, setMarketQuote] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState("");

  const fetchRiskData = useCallback(async (endpoint) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.detail || `Risk API failed with HTTP ${response.status}.`);
    }

    if (!payload || !Array.isArray(payload.data)) {
      throw new Error(`Invalid response received from ${endpoint}.`);
    }

    return payload.data;
  }, []);

  const loadRiskData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.all([
        fetchRiskData(ENDPOINTS.volatilityPredictions),
        fetchRiskData(ENDPOINTS.featureImportance),
        fetchRiskData(ENDPOINTS.shapGlobal),
        fetchRiskData(ENDPOINTS.limeGlobal),
        fetchRiskData(ENDPOINTS.stressSummary),
        fetchRiskData(ENDPOINTS.stressContributors),
      ]);

      setVolatilityPredictions(results[0]);
      setFeatureImportance(results[1]);
      setShapGlobal(results[2]);
      setLimeGlobal(results[3]);
      setStressSummary(results[4]);
      setStressContributors(results[5]);
      setLastRefresh(new Date());
      setSecondsUntilRefresh(REFRESH_INTERVAL);
    } catch (err) {
      console.error("Risk Analysis API error:", err);
      setError(err instanceof Error ? err.message : "Unable to load risk analysis data.");
    } finally {
      setLoading(false);
    }
  }, [fetchRiskData]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsUntilRefresh((previous) => (
        previous <= 1 ? REFRESH_INTERVAL : previous - 1
      ));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsUntilRefresh !== REFRESH_INTERVAL || !lastRefresh) return undefined;
    const timer = window.setTimeout(() => loadRiskData(), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsUntilRefresh, lastRefresh, loadRiskData]);

  const filteredPredictions = useMemo(() => {
    const search = searchTerm.trim().toUpperCase();
    return volatilityPredictions
      .filter((row) => {
        const symbol = String(getPredictionSymbol(row)).toUpperCase();
        return (
          (selectedStock === "ALL" || symbol === selectedStock) &&
          (!search || symbol.includes(search))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(getPredictionDate(a)).getTime();
        const dateB = new Date(getPredictionDate(b)).getTime();
        return dateB - dateA;
      });
  }, [volatilityPredictions, selectedStock, searchTerm]);

  const latestPrediction = filteredPredictions[0] || null;
  const visiblePredictions = showAllPredictions
    ? filteredPredictions
    : filteredPredictions.slice(0, 12);

  const latestActual = latestPrediction ? toNumber(getActualVolatility(latestPrediction)) : null;
  const latestPredicted = latestPrediction ? toNumber(getPredictedVolatility(latestPrediction)) : null;
  const latestAbsoluteError = latestPrediction ? toNumber(getAbsoluteError(latestPrediction)) : null;

  const averageAbsoluteError = useMemo(() => {
    const errors = filteredPredictions.map(getAbsoluteError).map(toNumber).filter((value) => value !== null);
    if (!errors.length) return null;
    return errors.reduce((sum, value) => sum + value, 0) / errors.length;
  }, [filteredPredictions]);

  const sortedFeatureImportance = useMemo(() => (
    [...featureImportance].sort((a, b) => (
      (toNumber(getField(b, ["Importance", "importance", "Feature_Importance", "feature_importance", "Value", "value"])) || 0) -
      (toNumber(getField(a, ["Importance", "importance", "Feature_Importance", "feature_importance", "Value", "value"])) || 0)
    ))
  ), [featureImportance]);

  const sortedShap = useMemo(() => (
    [...shapGlobal].sort((a, b) => (
      (toNumber(getField(b, ["Mean_Abs_SHAP", "mean_abs_shap", "Mean Absolute SHAP", "SHAP", "shap", "Value", "value"])) || 0) -
      (toNumber(getField(a, ["Mean_Abs_SHAP", "mean_abs_shap", "Mean Absolute SHAP", "SHAP", "shap", "Value", "value"])) || 0)
    ))
  ), [shapGlobal]);

  const sortedLime = useMemo(() => (
    [...limeGlobal].sort((a, b) => (
      (toNumber(getField(b, ["Mean_Abs_LIME", "mean_abs_lime", "Mean Absolute LIME", "LIME", "lime", "Value", "value"])) || 0) -
      (toNumber(getField(a, ["Mean_Abs_LIME", "mean_abs_lime", "Mean Absolute LIME", "LIME", "lime", "Value", "value"])) || 0)
    ))
  ), [limeGlobal]);

  const sortedStress = useMemo(() => (
    [...stressSummary].sort((a, b) => (
      (toNumber(getLossPercentage(b)) || 0) - (toNumber(getLossPercentage(a)) || 0)
    ))
  ), [stressSummary]);

  const strongestStress = useMemo(() => {
    const nonBaseline = sortedStress.filter((row) => {
      const scenario = String(getScenarioName(row)).toLowerCase();
      const shock = toNumber(getMarketShock(row));
      return !scenario.includes("baseline") && shock !== 0;
    });
    return nonBaseline[0] || sortedStress[0] || null;
  }, [sortedStress]);

  useEffect(() => {
    if (!sortedStress.length) return;
    const strongestIndex = sortedStress.findIndex((row) => row === strongestStress);
    setSelectedScenarioIndex(strongestIndex >= 0 ? strongestIndex : 0);
  }, [sortedStress, strongestStress]);

  const selectedScenario = sortedStress[selectedScenarioIndex] || strongestStress || null;

  const selectedContributors = useMemo(() => {
    if (!stressContributors.length) return [];

    const selectedName = String(getScenarioName(selectedScenario)).trim().toLowerCase();
    if (selectedName) {
      const scenarioRows = stressContributors.filter((row) => (
        String(getScenarioName(row)).trim().toLowerCase() === selectedName
      ));
      if (scenarioRows.length) return scenarioRows;
    }

    return stressContributors;
  }, [stressContributors, selectedScenario]);

  const marketSymbol = selectedStock !== "ALL"
    ? selectedStock
    : getPredictionSymbol(latestPrediction);

  const loadMarketQuote = useCallback(async (symbol) => {
    if (!symbol) {
      setMarketQuote(null);
      setMarketError("");
      return;
    }

    setMarketLoading(true);
    setMarketError("");

    try {
      const quote = await fetchMarketQuote(symbol);
      setMarketQuote(quote);
    } catch (err) {
      console.error("Market quote error:", err);
      setMarketQuote(null);
      setMarketError(err instanceof Error ? err.message : "Unable to retrieve market data.");
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!marketSymbol) {
      setMarketQuote(null);
      setMarketError("");
      return;
    }
    loadMarketQuote(marketSymbol);
  }, [marketSymbol, loadMarketQuote]);

  useEffect(() => {
    if (!marketSymbol) return undefined;
    const timer = window.setInterval(() => loadMarketQuote(marketSymbol), 60000);
    return () => window.clearInterval(timer);
  }, [marketSymbol, loadMarketQuote]);

  const handleRefresh = async () => {
    await loadRiskData();
    const symbolAfterRefresh = selectedStock !== "ALL"
      ? selectedStock
      : getPredictionSymbol(latestPrediction);
    if (symbolAfterRefresh) await loadMarketQuote(symbolAfterRefresh);
  };

  const currentDate = getCurrentISTDate();
  const strongestStressLoss = strongestStress ? toNumber(getLossPercentage(strongestStress)) : null;
  const strongestStressName = strongestStress ? getScenarioName(strongestStress) : null;
  const leadingFeature = sortedFeatureImportance[0]
    ? getField(sortedFeatureImportance[0], ["Feature", "feature", "Feature_Name", "feature_name", "Name", "name"])
    : null;
  const selectedMarketChange = marketQuote ? toNumber(marketQuote.change_percent) : null;

  const chartRows = useMemo(() => (
    visiblePredictions
      .filter((row) => toNumber(getActualVolatility(row)) !== null || toNumber(getPredictedVolatility(row)) !== null)
      .slice(0, 8)
  ), [visiblePredictions]);

  const chartMax = useMemo(() => {
    const values = chartRows.flatMap((row) => [
      toNumber(getActualVolatility(row)),
      toNumber(getPredictedVolatility(row)),
    ]).filter((value) => value !== null);
    return Math.max(...values, 0.0001);
  }, [chartRows]);

  const hasLimeValues = sortedLime.some((row) => (
    toNumber(getField(row, ["Mean_Abs_LIME", "mean_abs_lime", "Mean Absolute LIME", "LIME", "lime", "Value", "value"])) !== null
  ));

  const hasContributorValues = selectedContributors.some((row) => (
    toNumber(getContributorValue(row)) !== null
  ));

  const modelSourceStatus = error ? "Unavailable" : "6/6 data endpoints responding";

  return (
    <main className="risk-analysis-page">
      <section className="risk-page-header">
        <div>
          <div className="risk-page-kicker">Quantitative Risk Intelligence</div>
          <h1>Risk Analysis</h1>
          <p>Volatility forecasting, explainability, stress testing and available market context.</p>
        </div>
        <div className="risk-page-date">
          <Clock3 size={16} />
          <span>Current analysis</span>
          <strong>{currentDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}</strong>
          <span>IST · {currentDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</span>
        </div>
      </section>

      <section className="risk-status-strip">
        <button type="button" onClick={handleRefresh} disabled={loading} className="risk-refresh-button">
          <RefreshCw size={16} className={loading ? "risk-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh Analysis"}
        </button>
        <div className="risk-status-item">
          {error ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>Risk data status</span>
          <strong>{modelSourceStatus}</strong>
        </div>
        <div className="risk-status-item">
          <Clock3 size={17} />
          <span>Last refreshed</span>
          <strong>{formatTime(lastRefresh) || "—"}</strong>
        </div>
        <div className="risk-status-item">
          <Activity size={17} />
          <span>Auto refresh</span>
          <strong>ON · {secondsUntilRefresh}s</strong>
        </div>
      </section>

      {error && (
        <section className="risk-error-panel">
          <AlertTriangle size={20} />
          <div><strong>Risk data could not be loaded</strong><p>{error}</p></div>
          <button type="button" onClick={handleRefresh}>Retry</button>
        </section>
      )}

      {/* Market context is deliberately omitted when the provider has no usable quote. */}
      {(marketQuote || marketLoading) && (
        <section className="risk-market-context">
          <div className="risk-section-header">
            <div>
              <div className="risk-section-kicker">Available Market Context</div>
              <h2>{marketSymbol || "Selected Stock"}</h2>
              <p>Latest provider quote is shown separately from the historical model observations.</p>
            </div>
            <button type="button" className="risk-refresh-button" onClick={() => loadMarketQuote(marketSymbol)} disabled={marketLoading || !marketSymbol}>
              <RefreshCw size={16} className={marketLoading ? "risk-spin" : ""} />
              {marketLoading ? "Loading..." : "Refresh Quote"}
            </button>
          </div>

          {marketLoading && <div className="risk-market-status">Retrieving the latest available market quote...</div>}

          {!marketLoading && marketQuote && (
            <>
              <div className="risk-market-grid">
                {marketQuote.price != null && <div className="risk-market-card"><span>Current Market Price</span><strong>₹{Number(marketQuote.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>Latest available quote</small></div>}
                {selectedMarketChange !== null && <div className="risk-market-card"><span>Daily Change</span><strong className={selectedMarketChange >= 0 ? "positive" : "negative"}>{selectedMarketChange >= 0 ? "+" : ""}{selectedMarketChange.toFixed(2)}%</strong><small>Versus previous available session</small></div>}
                {marketQuote.high != null && marketQuote.low != null && <div className="risk-market-card"><span>Day Range</span><strong>₹{Number(marketQuote.low).toLocaleString("en-IN", { maximumFractionDigits: 2 })} – ₹{Number(marketQuote.high).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong><small>Latest available daily range</small></div>}
                {marketQuote.volume != null && <div className="risk-market-card"><span>Volume</span><strong>{Number(marketQuote.volume).toLocaleString("en-IN")}</strong><small>Latest available daily volume</small></div>}
              </div>
              <div className="risk-market-source">Source: {marketQuote.source || "Configured market-data provider"}. This is provider data and is not presented as an official NSE exchange feed.</div>
            </>
          )}
        </section>
      )}

      <section className="risk-kpi-grid">
        {latestPredicted !== null && <article className="risk-kpi-card"><div className="risk-kpi-icon"><Gauge size={20} /></div><span>Predicted Volatility</span><strong>{formatPercent(latestPredicted)}</strong><small>Model output · {getPredictionSymbol(latestPrediction) || "Selected stock"}</small></article>}
        {latestActual !== null && <article className="risk-kpi-card"><div className="risk-kpi-icon"><Activity size={20} /></div><span>Actual Volatility</span><strong>{formatPercent(latestActual)}</strong><small>Latest available model observation</small></article>}
        {strongestStressLoss !== null && <article className="risk-kpi-card"><div className="risk-kpi-icon"><TrendingDown size={20} /></div><span>Strongest Stress Loss</span><strong>{formatRawPercent(strongestStressLoss)}</strong><small>{strongestStressName || "Reported stress scenario"}</small></article>}
        {averageAbsoluteError !== null && <article className="risk-kpi-card"><div className="risk-kpi-icon"><AlertTriangle size={20} /></div><span>Average Absolute Error</span><strong>{formatNumber(averageAbsoluteError, 5)}</strong><small>Across the selected model observations</small></article>}
      </section>

      <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Data-derived intelligence</div><h2>Risk Insights</h2><p>Only conclusions supported by the returned model artifacts are displayed.</p></div></div>
        <div className="risk-insight-grid">
          {latestPredicted !== null && <article className="risk-insight-card"><Sparkles size={18} /><div><span>Latest model volatility</span><strong>{getPredictionSymbol(latestPrediction) || "Selected stock"} has a predicted volatility of {formatPercent(latestPredicted)}.</strong></div></article>}
          {latestActual !== null && <article className="risk-insight-card"><Activity size={18} /><div><span>Observed model volatility</span><strong>The latest available actual volatility in the model output is {formatPercent(latestActual)}.</strong></div></article>}
          {latestAbsoluteError !== null && <article className="risk-insight-card"><AlertTriangle size={18} /><div><span>Latest prediction error</span><strong>The latest reported absolute prediction error is {formatNumber(latestAbsoluteError, 5)}.</strong></div></article>}
          {strongestStressLoss !== null && strongestStressName && <article className="risk-insight-card"><TrendingDown size={18} /><div><span>Strongest stress scenario</span><strong>{strongestStressName} has the largest reported non-baseline loss of {formatRawPercent(strongestStressLoss)}.</strong></div></article>}
          {leadingFeature && <article className="risk-insight-card"><BrainCircuit size={18} /><div><span>Leading model feature</span><strong>{leadingFeature} has the highest reported feature-importance value.</strong></div></article>}
        </div>
      </section>

      <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Volatility model output</div><h2>Actual vs Predicted Volatility</h2><p>Historical observations returned by the existing volatility prediction artifact. Observation dates are intentionally not displayed.</p></div></div>

        <div className="risk-filter-bar">
          <div className="risk-search"><Search size={17} /><input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search stock..." /></div>
          <div className="risk-select"><Database size={17} /><select value={selectedStock} onChange={(event) => setSelectedStock(event.target.value)}><option value="ALL">All stocks</option>{STOCKS.map((stock) => <option key={stock} value={stock}>{stock}</option>)}</select><ChevronDown size={16} /></div>
        </div>

        {chartRows.length > 0 && (
          <div className="risk-chart-card">
            <div className="risk-chart-header"><div><span className="risk-section-kicker">Model comparison</span><h3>Volatility profile</h3><p>Actual and predicted volatility for the displayed model observations.</p></div><div className="risk-chart-legend"><span><i className="legend-actual" />Actual</span><span><i className="legend-predicted" />Predicted</span></div></div>
            <div className="risk-volatility-chart">
              {chartRows.map((row, index) => {
                const actual = toNumber(getActualVolatility(row));
                const predicted = toNumber(getPredictedVolatility(row));
                return (
                  <div className="risk-chart-row" key={`${getPredictionSymbol(row)}-${index}`}>
                    <div className="risk-chart-symbol">{getPredictionSymbol(row) || "—"}</div>
                    <div className="risk-chart-bars">
                      {actual !== null && <div className="risk-chart-bar"><span className="risk-bar-label">{formatPercent(actual)}</span><span className="risk-bar actual" style={{ width: `${Math.max((actual / chartMax) * 100, 3)}%` }} /></div>}
                      {predicted !== null && <div className="risk-chart-bar"><span className="risk-bar-label">{formatPercent(predicted)}</span><span className="risk-bar predicted" style={{ width: `${Math.max((predicted / chartMax) * 100, 3)}%` }} /></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredPredictions.length > 0 ? (
          <>
            <div className="risk-table-wrapper">
              <table className="risk-data-table">
                <thead><tr><th>Stock</th><th>Actual Volatility</th><th>Predicted Volatility</th><th>Absolute Error</th><th>Model Signal</th></tr></thead>
                <tbody>
                  {visiblePredictions.map((row, index) => {
                    const actual = toNumber(getActualVolatility(row));
                    const predicted = toNumber(getPredictedVolatility(row));
                    const absoluteError = toNumber(getAbsoluteError(row));
                    const difference = predicted !== null && actual !== null ? predicted - actual : null;
                    return (
                      <tr key={`${getPredictionSymbol(row)}-${getPredictionDate(row)}-${index}`}>
                        <td><strong>{getPredictionSymbol(row) || "—"}</strong></td>
                        <td>{formatPercent(actual) ?? "—"}</td>
                        <td><strong>{formatPercent(predicted) ?? "—"}</strong></td>
                        <td>{formatNumber(absoluteError, 5) ?? "—"}</td>
                        <td>{difference !== null ? <span className={difference >= 0 ? "risk-signal-positive" : "risk-signal-negative"}>{difference >= 0 ? "Predicted above actual" : "Predicted below actual"}</span> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="risk-table-footer"><span>Showing {visiblePredictions.length} of {filteredPredictions.length} matching observations</span>{filteredPredictions.length > 12 && <button type="button" onClick={() => setShowAllPredictions((value) => !value)}>{showAllPredictions ? "Show latest 12" : "View all observations"}</button>}</div>
          </>
        ) : (
          <div className="risk-empty-state"><Info size={20} /><span>No volatility predictions are available for the selected filter.</span></div>
        )}
      </section>

      {sortedFeatureImportance.length > 0 && <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Model intelligence</div><h2>Feature Importance</h2><p>Features ranked using the existing model-importance artifact.</p></div><button type="button" onClick={() => setShowAllFeatures((value) => !value)}>{showAllFeatures ? "Show top 8" : "View all"}</button></div>
        <div className="risk-feature-grid">
          {(showAllFeatures ? sortedFeatureImportance : sortedFeatureImportance.slice(0, 8)).map((row, index) => {
            const feature = getField(row, ["Feature", "feature", "Feature_Name", "feature_name", "Name", "name"]);
            const importance = toNumber(getField(row, ["Importance", "importance", "Feature_Importance", "feature_importance", "Value", "value"]));
            if (!feature || importance === null) return null;
            return <article className="risk-feature-card" key={`${feature}-${index}`}><span>{feature}</span><strong>{formatNumber(importance, 5)}</strong></article>;
          })}
        </div>
      </section>}

      {sortedShap.length > 0 && <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Explainable AI</div><h2>SHAP Global Drivers</h2><p>Global feature influence from the existing SHAP artifact.</p></div><button type="button" onClick={() => setShowAllShap((value) => !value)}>{showAllShap ? "Show top 8" : "View all"}</button></div>
        <div className="risk-driver-grid">
          {(showAllShap ? sortedShap : sortedShap.slice(0, 8)).map((row, index) => {
            const feature = getField(row, ["Feature", "feature", "Feature_Name", "feature_name", "Name", "name"]);
            const value = toNumber(getField(row, ["Mean_Abs_SHAP", "mean_abs_shap", "Mean Absolute SHAP", "SHAP", "shap", "Value", "value"]));
            if (!feature || value === null) return null;
            return <article className="risk-driver-card" key={`${feature}-${index}`}><div className="risk-driver-rank">{index + 1}</div><div><strong>{feature}</strong><span>{formatNumber(value, 5)}</span></div></article>;
          })}
        </div>
      </section>}

      {hasLimeValues && <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Explainable AI</div><h2>LIME Global Drivers</h2><p>Global ranking derived from the existing LIME explanation artifact.</p></div><button type="button" onClick={() => setShowAllLime((value) => !value)}>{showAllLime ? "Show top 8" : "View all"}</button></div>
        <div className="risk-driver-grid">
          {(showAllLime ? sortedLime : sortedLime.slice(0, 8)).map((row, index) => {
            const feature = getField(row, ["Feature", "feature", "Feature_Name", "feature_name", "Name", "name"]);
            const value = toNumber(getField(row, ["Mean_Abs_LIME", "mean_abs_lime", "Mean Absolute LIME", "LIME", "lime", "Value", "value"]));
            if (!feature || value === null) return null;
            return <article className="risk-driver-card" key={`${feature}-${index}`}><div className="risk-driver-rank">{index + 1}</div><div><strong>{feature}</strong><span>{formatNumber(value, 5)}</span></div></article>;
          })}
        </div>
      </section>}

      {sortedStress.length > 0 && <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Scenario analysis</div><h2>Stress Testing</h2><p>Select a scenario to inspect its reported market shock, loss and available attribution.</p></div></div>
        <div className="risk-stress-grid">
          {sortedStress.map((row, index) => {
            const isSelected = index === selectedScenarioIndex;
            const scenario = getScenarioName(row);
            const shock = formatRawPercent(getMarketShock(row));
            const loss = formatRawPercent(getLossPercentage(row));
            return <button type="button" key={`${scenario}-${index}`} className={isSelected ? "risk-stress-card selected" : "risk-stress-card"} onClick={() => setSelectedScenarioIndex(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{scenario || "Scenario"}</strong>{shock !== null && <small>Market shock {shock}</small>}{loss !== null && <b>{loss}</b>}</button>;
          })}
        </div>
        {selectedScenario && <div className="risk-selected-scenario"><div><span>Selected scenario</span><h3>{getScenarioName(selectedScenario) || "Scenario"}</h3></div>{getMarketShock(selectedScenario) != null && <div><span>Market shock</span><strong>{formatRawPercent(getMarketShock(selectedScenario))}</strong></div>}{getLossPercentage(selectedScenario) != null && <div><span>Reported loss</span><strong>{formatRawPercent(getLossPercentage(selectedScenario))}</strong></div>}<p>Values shown here are taken directly from the stress-testing output returned by the backend.</p></div>}
      </section>}

      {hasContributorValues && <section className="risk-section">
        <div className="risk-section-header"><div><div className="risk-section-kicker">Scenario attribution</div><h2>Stress Contributors</h2><p>Largest reported contributors associated with the selected stress scenario.</p></div></div>
        <div className="risk-contributor-list">
          {selectedContributors.filter((row) => getContributorSymbol(row) && toNumber(getContributorValue(row)) !== null).slice(0, 10).map((row, index) => <article className="risk-contributor-row" key={`${getContributorSymbol(row)}-${index}`}><div className="risk-contributor-rank">{String(index + 1).padStart(2, "0")}</div><div><strong>{getContributorSymbol(row)}</strong><span>Reported contribution</span></div><b>{formatRawPercent(getContributorValue(row))}</b></article>)}
        </div>
      </section>}

      <footer className="risk-analysis-footer"><ShieldCheck size={18} /><span>Refresh retrieves the latest available backend model outputs and available market quote. Historical model observations are displayed without their observation dates.</span></footer>
    </main>
  );
}
