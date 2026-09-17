import yfinance as yf

from datetime import datetime, timezone
from typing import Any, Dict, List


# ============================================================
# CONSTANTS
# ============================================================

DEFAULT_COUNT = 10
MIN_COUNT = 1
MAX_COUNT = 50


# ============================================================
# SYMBOL NORMALIZATION
# ============================================================

def normalize_symbol(symbol: str) -> str:
    """
    Convert common Indian stock symbols into Yahoo Finance format.

    Examples:
        RELIANCE      -> RELIANCE.NS
        TCS           -> TCS.NS
        INFY          -> INFY.NS
        RELIANCE.NS   -> RELIANCE.NS
    """

    if not symbol:
        return ""

    symbol = str(symbol).strip().upper()

    if not symbol:
        return ""

    # Already contains an exchange suffix
    if "." in symbol:
        return symbol

    # Default Indian exchange
    return f"{symbol}.NS"


# ============================================================
# SAFE TEXT HELPER
# ============================================================

def clean_text(value: Any) -> str:
    """
    Safely convert a value to clean text.
    """

    if value is None:
        return ""

    try:
        return str(value).strip()
    except Exception:
        return ""


# ============================================================
# URL EXTRACTION
# ============================================================

def extract_url(content: Dict[str, Any]) -> str:
    """
    Extract article URL from different Yahoo Finance
    news response structures.
    """

    # --------------------------------------------------------
    # canonicalUrl
    # --------------------------------------------------------

    canonical_url = content.get("canonicalUrl")

    if isinstance(canonical_url, dict):

        url = clean_text(
            canonical_url.get("url")
        )

        if url:
            return url

    elif isinstance(canonical_url, str):

        url = clean_text(canonical_url)

        if url:
            return url

    # --------------------------------------------------------
    # clickThroughUrl
    # --------------------------------------------------------

    click_url = content.get("clickThroughUrl")

    if isinstance(click_url, dict):

        url = clean_text(
            click_url.get("url")
        )

        if url:
            return url

    elif isinstance(click_url, str):

        url = clean_text(click_url)

        if url:
            return url

    # --------------------------------------------------------
    # Direct URL
    # --------------------------------------------------------

    direct_url = clean_text(
        content.get("url")
    )

    if direct_url:
        return direct_url

    return ""


# ============================================================
# SOURCE EXTRACTION
# ============================================================

def extract_source(content: Dict[str, Any]) -> str:
    """
    Extract the news provider/source name.
    """

    provider = content.get("provider")

    if isinstance(provider, dict):

        source = clean_text(
            provider.get("displayName")
        )

        if source:
            return source

        source = clean_text(
            provider.get("name")
        )

        if source:
            return source

    elif isinstance(provider, str):

        source = clean_text(provider)

        if source:
            return source

    # Some Yahoo responses may contain publisher
    publisher = clean_text(
        content.get("publisher")
    )

    if publisher:
        return publisher

    return ""


# ============================================================
# PUBLICATION DATE EXTRACTION
# ============================================================

def extract_published_at(
    item: Dict[str, Any],
    content: Dict[str, Any]
) -> str:
    """
    Extract publication timestamp from Yahoo Finance news.
    """

    possible_values = [

        content.get("pubDate"),

        content.get("publishedAt"),

        content.get("publishTime"),

        item.get("pubDate"),

        item.get("publishedAt"),

        item.get("providerPublishTime")
    ]

    for value in possible_values:

        if value is None:
            continue

        # Unix timestamp
        if isinstance(value, (int, float)):

            try:

                dt = datetime.fromtimestamp(
                    value,
                    tz=timezone.utc
                )

                return dt.isoformat()

            except Exception:

                continue

        value = clean_text(value)

        if value:
            return value

    return ""


# ============================================================
# DATE PARSING
# ============================================================

def parse_datetime(
    published_at: str
):
    """
    Convert different timestamp formats into
    timezone-aware datetime.
    """

    if not published_at:
        return None

    try:

        value = published_at.strip()

        # ----------------------------------------------------
        # ISO 8601
        # ----------------------------------------------------

        normalized_value = value.replace(
            "Z",
            "+00:00"
        )

        parsed_time = datetime.fromisoformat(
            normalized_value
        )

        # ----------------------------------------------------
        # Make timezone-aware
        # ----------------------------------------------------

        if parsed_time.tzinfo is None:

            parsed_time = parsed_time.replace(
                tzinfo=timezone.utc
            )

        return parsed_time.astimezone(
            timezone.utc
        )

    except Exception:

        pass

    # --------------------------------------------------------
    # Common RSS-style date format
    # --------------------------------------------------------

    common_formats = [

        "%a, %d %b %Y %H:%M:%S %z",

        "%a, %d %b %Y %H:%M:%S GMT",

        "%Y-%m-%d %H:%M:%S",

        "%Y-%m-%d"
    ]

    for date_format in common_formats:

        try:

            parsed_time = datetime.strptime(
                published_at,
                date_format
            )

            if parsed_time.tzinfo is None:

                parsed_time = parsed_time.replace(
                    tzinfo=timezone.utc
                )

            return parsed_time.astimezone(
                timezone.utc
            )

        except Exception:

            continue

    return None


# ============================================================
# FRESHNESS CALCULATION
# ============================================================

def calculate_freshness(
    published_at: str
) -> Dict[str, Any]:
    """
    Calculate how recent a news article is.

    Categories:

        <= 24 hours       -> fresh
        <= 7 days         -> recent
        <= 30 days        -> older
        > 30 days         -> stale
        invalid/missing   -> unknown
    """

    if not published_at:

        return {
            "age_hours": None,
            "freshness": "unknown"
        }

    published_time = parse_datetime(
        published_at
    )

    if published_time is None:

        return {
            "age_hours": None,
            "freshness": "unknown"
        }

    try:

        now = datetime.now(
            timezone.utc
        )

        age_hours = (
            now - published_time
        ).total_seconds() / 3600

        # Prevent negative ages if Yahoo's timestamp
        # is slightly ahead of the current system time.
        age_hours = max(
            age_hours,
            0
        )

        # ----------------------------------------------------
        # Fresh
        # ----------------------------------------------------

        if age_hours <= 24:

            freshness = "fresh"

        # ----------------------------------------------------
        # Recent
        # ----------------------------------------------------

        elif age_hours <= 24 * 7:

            freshness = "recent"

        # ----------------------------------------------------
        # Older
        # ----------------------------------------------------

        elif age_hours <= 24 * 30:

            freshness = "older"

        # ----------------------------------------------------
        # Stale
        # ----------------------------------------------------

        else:

            freshness = "stale"

        return {
            "age_hours": round(
                age_hours,
                1
            ),
            "freshness": freshness
        }

    except Exception:

        return {
            "age_hours": None,
            "freshness": "unknown"
        }


# ============================================================
# ARTICLE EXTRACTION
# ============================================================

def extract_article(
    item: Dict[str, Any],
    symbol: str
) -> Dict[str, Any] | None:
    """
    Convert a Yahoo Finance news item into the
    standardized QuantRisk AI article format.
    """

    if not isinstance(item, dict):

        return None

    # --------------------------------------------------------
    # Yahoo Finance usually stores information under content.
    # --------------------------------------------------------

    content = item.get(
        "content",
        {}
    )

    if not isinstance(content, dict):

        content = {}

    # --------------------------------------------------------
    # Title
    # --------------------------------------------------------

    title = clean_text(
        content.get("title")
        or item.get("title")
    )

    if not title:

        return None

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    summary = clean_text(
        content.get("summary")
        or content.get("description")
        or item.get("summary")
        or item.get("description")
    )

    # --------------------------------------------------------
    # URL
    # --------------------------------------------------------

    url = extract_url(
        content
    )

    # If URL isn't in content, check item itself
    if not url:

        url = clean_text(
            item.get("url")
        )

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    source = extract_source(
        content
    )

    # --------------------------------------------------------
    # Publication time
    # --------------------------------------------------------

    published_at = extract_published_at(
        item,
        content
    )

    # --------------------------------------------------------
    # Freshness
    # --------------------------------------------------------

    freshness_info = calculate_freshness(
        published_at
    )

    # --------------------------------------------------------
    # Standardized article
    # --------------------------------------------------------

    article = {

        "symbol": symbol,

        "title": title,

        "summary": summary,

        "url": url,

        "source": source,

        "published_at": published_at,

        "age_hours": freshness_info[
            "age_hours"
        ],

        "freshness": freshness_info[
            "freshness"
        ]
    }

    return article


# ============================================================
# NEWS COLLECTION
# ============================================================

def collect_news(
    symbol: str,
    count: int = DEFAULT_COUNT
):
    """
    Collect recent financial news for a specific stock.

    This function is intentionally NOT cached so that every
    frontend request can retrieve the current Yahoo Finance
    news response.

    Parameters
    ----------
    symbol : str
        Stock symbol such as RELIANCE.NS, TCS.NS, INFY.NS.

    count : int
        Maximum number of articles requested.

    Returns
    -------
    dict
        Standardized QuantRisk AI news response.
    """

    # ========================================================
    # VALIDATE SYMBOL
    # ========================================================

    normalized_symbol = normalize_symbol(
        symbol
    )

    if not normalized_symbol:

        return {
            "status": "error",
            "message": "Stock symbol is required.",
            "symbol": "",
            "article_count": 0,
            "articles": []
        }

    # ========================================================
    # VALIDATE COUNT
    # ========================================================

    try:

        count = int(count)

    except (TypeError, ValueError):

        count = DEFAULT_COUNT

    # Keep count within the supported range.
    count = max(
        MIN_COUNT,
        min(count, MAX_COUNT)
    )

    # ========================================================
    # DEBUG LOG
    # ========================================================

    print(
        f"[NEWS COLLECTOR] "
        f"symbol={normalized_symbol} "
        f"requested_count={count}"
    )

    # ========================================================
    # CREATE YAHOO TICKER
    # ========================================================

    try:

        ticker = yf.Ticker(
            normalized_symbol
        )

    except Exception as error:

        print(
            f"[NEWS COLLECTOR ERROR] "
            f"Ticker creation failed for "
            f"{normalized_symbol}: {error}"
        )

        return {
            "status": "error",
            "message": (
                f"Unable to initialize Yahoo Finance "
                f"for {normalized_symbol}: {str(error)}"
            ),
            "symbol": normalized_symbol,
            "article_count": 0,
            "articles": []
        }

    # ========================================================
    # FETCH NEWS
    # ========================================================

    try:

        raw_news = ticker.get_news(
            count=count
        )

    except Exception as error:

        print(
            f"[NEWS COLLECTOR ERROR] "
            f"Yahoo Finance failed for "
            f"{normalized_symbol}: {error}"
        )

        return {
            "status": "error",
            "message": (
                f"Unable to collect news for "
                f"{normalized_symbol}: {str(error)}"
            ),
            "symbol": normalized_symbol,
            "article_count": 0,
            "articles": []
        }

    # ========================================================
    # HANDLE EMPTY RESPONSE
    # ========================================================

    if raw_news is None:

        raw_news = []

    if not isinstance(
        raw_news,
        list
    ):

        try:

            raw_news = list(
                raw_news
            )

        except Exception:

            raw_news = []

    print(
        f"[NEWS COLLECTOR] "
        f"{normalized_symbol}: "
        f"Yahoo returned {len(raw_news)} raw articles"
    )

    # ========================================================
    # PROCESS ARTICLES
    # ========================================================

    articles: List[Dict[str, Any]] = []

    # Used to prevent duplicate articles.
    seen_keys = set()

    for item in raw_news:

        try:

            article = extract_article(
                item=item,
                symbol=normalized_symbol
            )

            if article is None:

                continue

            # ------------------------------------------------
            # Duplicate detection
            # ------------------------------------------------

            url = article.get(
                "url",
                ""
            )

            title = article.get(
                "title",
                ""
            )

            if url:

                duplicate_key = (
                    "url",
                    url.lower()
                )

            else:

                duplicate_key = (
                    "title",
                    title.lower()
                )

            if duplicate_key in seen_keys:

                continue

            seen_keys.add(
                duplicate_key
            )

            articles.append(
                article
            )

        except Exception as article_error:

            print(
                f"[NEWS ARTICLE ERROR] "
                f"{normalized_symbol}: "
                f"{article_error}"
            )

            # One bad article must not break the
            # entire news request.
            continue

    # ========================================================
    # ENFORCE REQUESTED COUNT
    # ========================================================

    # Yahoo Finance may return more records than requested
    # depending on the provider/API response.
    #
    # We only expose the requested maximum to the frontend.

    articles = articles[:count]

    # ========================================================
    # FINAL LOG
    # ========================================================

    print(
        f"[NEWS COLLECTOR] "
        f"{normalized_symbol}: "
        f"returning {len(articles)} articles "
        f"(requested={count})"
    )

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "status": "success",

        "symbol": normalized_symbol,

        "requested_article_count": count,

        "article_count": len(articles),

        "articles": articles
    }