from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

from backend.news.company_map import get_company_name


# ============================================================
# CONSTANTS
# ============================================================

DEFAULT_COUNT = 10
MIN_COUNT = 1
MAX_COUNT = 50

GOOGLE_NEWS_RSS_URL = (
    "https://news.google.com/rss/search"
)

GOOGLE_NEWS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/140.0 Safari/537.36"
    )
}


# ============================================================
# SYMBOL NORMALIZATION
# ============================================================

def normalize_symbol(symbol: str) -> str:
    """
    Convert common Indian stock symbols into a consistent
    QuantRisk AI format.

    Examples:

        RELIANCE       -> RELIANCE.NS
        TCS            -> TCS.NS
        INFY           -> INFY.NS
        RELIANCE.NS    -> RELIANCE.NS
        RELIANCE.BSE   -> RELIANCE.BSE
    """

    if not symbol:
        return ""

    symbol = str(symbol).strip().upper()

    if not symbol:
        return ""

    if "." in symbol:
        return symbol

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
# HTML TEXT CLEANING
# ============================================================

class HTMLTextParser(HTMLParser):
    """
    Small HTML parser used to remove HTML tags from RSS
    descriptions while keeping their readable text.
    """

    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def get_text(self):
        return " ".join(self.parts)


def strip_html(value: Any) -> str:
    """
    Convert HTML-containing RSS text into readable plain text.
    """

    text = clean_text(value)

    if not text:
        return ""

    try:
        parser = HTMLTextParser()
        parser.feed(text)

        cleaned = parser.get_text()

        return " ".join(
            unescape(cleaned).split()
        )

    except Exception:
        return " ".join(
            unescape(text).split()
        )


# ============================================================
# SYMBOL SEARCH QUERY
# ============================================================

def get_search_queries(symbol: str) -> list[str]:
    """
    Build Google News search queries for an Indian stock.

    The company name is preferred because news publishers
    generally use the company name rather than the Yahoo
    Finance ticker symbol.
    """

    normalized_symbol = normalize_symbol(symbol)

    if not normalized_symbol:
        return []

    base_symbol = normalized_symbol.split(".")[0]

    queries = []

    # --------------------------------------------------------
    # Company name from the project's existing company map.
    # --------------------------------------------------------

    try:

        company_name = clean_text(
            get_company_name(
                normalized_symbol
            )
        )

        if company_name:
            queries.append(
                f'"{company_name}" stock'
            )

            queries.append(
                f'"{company_name}" shares'
            )

    except Exception as error:

        print(
            f"[NEWS COLLECTOR] "
            f"Company-name lookup failed for "
            f"{normalized_symbol}: {error}"
        )

    # --------------------------------------------------------
    # Ticker-based fallback.
    # --------------------------------------------------------

    queries.append(
        f'"{base_symbol}" stock India'
    )

    # --------------------------------------------------------
    # Remove duplicate queries while preserving order.
    # --------------------------------------------------------

    unique_queries = []

    seen = set()

    for query in queries:

        key = query.strip().lower()

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)

        unique_queries.append(query)

    return unique_queries


# ============================================================
# DATE PARSING
# ============================================================

def parse_datetime(
    published_at: str
):
    """
    Convert common RSS/ISO timestamp formats into a
    timezone-aware UTC datetime.
    """

    if not published_at:
        return None

    value = clean_text(
        published_at
    )

    if not value:
        return None

    # --------------------------------------------------------
    # RFC 2822 / RSS dates
    # --------------------------------------------------------

    try:

        parsed_time = parsedate_to_datetime(
            value
        )

        if parsed_time is not None:

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
    # ISO 8601
    # --------------------------------------------------------

    try:

        normalized_value = value.replace(
            "Z",
            "+00:00"
        )

        parsed_time = datetime.fromisoformat(
            normalized_value
        )

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
    # Additional common formats
    # --------------------------------------------------------

    common_formats = [

        "%Y-%m-%d %H:%M:%S",

        "%Y-%m-%d"
    ]

    for date_format in common_formats:

        try:

            parsed_time = datetime.strptime(
                value,
                date_format
            )

            parsed_time = parsed_time.replace(
                tzinfo=timezone.utc
            )

            return parsed_time

        except Exception:
            continue

    return None


# ============================================================
# FRESHNESS CALCULATION
# ============================================================

def calculate_freshness(
    published_at: str
) -> dict[str, Any]:
    """
    Calculate how recent an article is.

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

        age_hours = max(
            age_hours,
            0
        )

        if age_hours <= 24:

            freshness = "fresh"

        elif age_hours <= 24 * 7:

            freshness = "recent"

        elif age_hours <= 24 * 30:

            freshness = "older"

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
# GOOGLE NEWS RSS FETCH
# ============================================================

def fetch_google_news(
    query: str,
    count: int
) -> list[dict[str, Any]]:
    """
    Fetch Google News search results through its RSS feed.

    This does not require an API key.
    """

    rss_url = (
        f"{GOOGLE_NEWS_RSS_URL}"
        f"?q={quote_plus(query)}"
        f"&hl=en-IN"
        f"&gl=IN"
        f"&ceid=IN:en"
    )

    print(
        f"[NEWS COLLECTOR] "
        f"Google News query={query}"
    )

    request = Request(
        rss_url,
        headers=GOOGLE_NEWS_HEADERS
    )

    with urlopen(
        request,
        timeout=15
    ) as response:

        xml_data = response.read()

    root = ET.fromstring(
        xml_data
    )

    articles = []

    for item in root.findall(
        ".//item"
    ):

        title = clean_text(
            item.findtext(
                "title",
                default=""
            )
        )

        link = clean_text(
            item.findtext(
                "link",
                default=""
            )
        )

        description = item.findtext(
            "description",
            default=""
        )

        description = strip_html(
            description
        )

        published_at = clean_text(
            item.findtext(
                "pubDate",
                default=""
            )
        )

        source_element = item.find(
            "source"
        )

        source = ""

        if source_element is not None:

            source = clean_text(
                source_element.text
            )

        if not title:
            continue

        articles.append({

            "title": title,

            "url": link,

            "source": source,

            "published_at": published_at,

            "summary": description
        })

        if len(articles) >= count:
            break

    return articles


# ============================================================
# ARTICLE EXTRACTION
# ============================================================

def extract_article(
    item: dict[str, Any],
    symbol: str
) -> dict[str, Any] | None:
    """
    Convert a Google News RSS item into the standardized
    QuantRisk AI article format.
    """

    if not isinstance(
        item,
        dict
    ):

        return None

    title = clean_text(
        item.get("title")
    )

    if not title:
        return None

    summary = clean_text(
        item.get("summary")
    )

    url = clean_text(
        item.get("url")
    )

    source = clean_text(
        item.get("source")
    )

    published_at = clean_text(
        item.get("published_at")
    )

    freshness_info = calculate_freshness(
        published_at
    )

    return {

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


# ============================================================
# NEWS COLLECTION
# ============================================================

def collect_news(
    symbol: str,
    count: int = DEFAULT_COUNT
):
    """
    Collect recent financial news for a specific stock.

    Primary source:
        Google News RSS search

    The returned structure is intentionally kept compatible
    with the existing QuantRisk AI NLP pipeline.
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

            "message": (
                "Stock symbol is required."
            ),

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

    count = max(
        MIN_COUNT,
        min(count, MAX_COUNT)
    )

    print(
        f"[NEWS COLLECTOR] "
        f"symbol={normalized_symbol} "
        f"requested_count={count}"
    )

    # ========================================================
    # SEARCH QUERIES
    # ========================================================

    queries = get_search_queries(
        normalized_symbol
    )

    if not queries:

        return {

            "status": "error",

            "message": (
                "Unable to build a news search query."
            ),

            "symbol": normalized_symbol,

            "article_count": 0,

            "articles": []
        }

    # ========================================================
    # COLLECT ARTICLES
    # ========================================================

    articles = []

    seen_keys = set()

    for query in queries:

        if len(articles) >= count:
            break

        try:

            raw_articles = fetch_google_news(
                query=query,
                count=count
            )

        except Exception as error:

            print(
                f"[NEWS COLLECTOR ERROR] "
                f"Google News failed for "
                f"{normalized_symbol}, "
                f"query={query}: {error}"
            )

            continue

        print(
            f"[NEWS COLLECTOR] "
            f"{normalized_symbol}: "
            f"query returned "
            f"{len(raw_articles)} articles"
        )

        for item in raw_articles:

            try:

                article = extract_article(
                    item=item,
                    symbol=normalized_symbol
                )

                if article is None:
                    continue

                url = clean_text(
                    article.get("url")
                )

                title = clean_text(
                    article.get("title")
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

                if len(articles) >= count:
                    break

            except Exception as article_error:

                print(
                    f"[NEWS ARTICLE ERROR] "
                    f"{normalized_symbol}: "
                    f"{article_error}"
                )

                continue

    # ========================================================
    # FINAL COUNT
    # ========================================================

    articles = articles[:count]

    print(
        f"[NEWS COLLECTOR] "
        f"{normalized_symbol}: "
        f"returning {len(articles)} articles "
        f"(requested={count})"
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    if not articles:

        return {

            "status": "error",

            "message": (
                f"No news articles were returned "
                f"for {normalized_symbol}."
            ),

            "symbol": normalized_symbol,

            "requested_article_count": count,

            "article_count": 0,

            "articles": []
        }

    return {

        "status": "success",

        "symbol": normalized_symbol,

        "requested_article_count": count,

        "article_count": len(articles),

        "articles": articles
    }