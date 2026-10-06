const API_BASE = "/api/market";

/**
 * Fetch the latest available market quote.
 *
 * Examples:
 *   WIPRO
 *   TCS
 *   RELIANCE
 *   INFY
 */
export async function fetchMarketQuote(symbol) {
  const cleanedSymbol = String(symbol || "")
    .trim()
    .toUpperCase();

  if (!cleanedSymbol) {
    throw new Error(
      "Stock symbol is required."
    );
  }

  const url =
    `${API_BASE}/quote?symbol=` +
    encodeURIComponent(cleanedSymbol);

  const response = await fetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.detail ||
      `Market API failed with HTTP ${response.status}.`;

    throw new Error(detail);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "Market API returned an invalid response."
    );
  }

  /*
   * The market backend must provide a usable price.
   * Other fields such as volume or previous_close
   * may legitimately be null depending on provider data.
   */
  if (
    typeof payload.price !== "number" ||
    !Number.isFinite(payload.price)
  ) {
    throw new Error(
      "Market API returned an invalid market price."
    );
  }

  return payload;
}


/**
 * Check whether the market API is registered
 * and reachable.
 */
export async function checkMarketHealth() {
  const response = await fetch(
    `${API_BASE}/health`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.detail ||
      `Market health check failed with HTTP ${response.status}.`;

    throw new Error(detail);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "Market health API returned an invalid response."
    );
  }

  return payload;
}