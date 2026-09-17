from collections import Counter
from typing import Any, Dict, List


# ============================================================
# RELEVANCE WEIGHTS
# ============================================================

RELEVANCE_WEIGHTS = {
    "direct_company": 1.00,
    "related_business": 0.75,
    "sector_market": 0.35,
    "irrelevant": 0.00
}


# ============================================================
# IMPACT WEIGHTS
# ============================================================

IMPACT_WEIGHTS = {
    "high": 25,
    "medium": 10,
    "low": 0
}


# ============================================================
# FRESHNESS WEIGHTS
# ============================================================

FRESHNESS_WEIGHTS = {
    "fresh": 1.00,
    "recent": 0.80,
    "older": 0.50,
    "stale": 0.20,
    "unknown": 0.50
}


# ============================================================
# SAFE NUMBER CONVERSION
# ============================================================

def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Safely convert a value to float.
    """

    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


# ============================================================
# SAFE ARTICLE LIST
# ============================================================

def safe_articles(articles: Any) -> List[Dict[str, Any]]:
    """
    Ensure that the supplied article collection is a clean
    list of dictionaries.
    """

    if not isinstance(articles, list):
        return []

    return [
        article
        for article in articles
        if isinstance(article, dict)
    ]


# ============================================================
# GET FRESHNESS WEIGHT
# ============================================================

def get_freshness_weight(article: dict) -> float:
    """
    Return the numerical freshness weight for an article.
    """

    if not isinstance(article, dict):
        return FRESHNESS_WEIGHTS["unknown"]

    freshness = str(
        article.get(
            "freshness",
            "unknown"
        )
    ).strip().lower()

    return FRESHNESS_WEIGHTS.get(
        freshness,
        FRESHNESS_WEIGHTS["unknown"]
    )


# ============================================================
# GET RELEVANCE WEIGHT
# ============================================================

def get_relevance_weight(article: dict) -> float:
    """
    Return the numerical relevance weight for an article.
    """

    if not isinstance(article, dict):
        return 0.0

    relevance = article.get(
        "relevance",
        {}
    )

    if not isinstance(relevance, dict):
        return 0.0

    category = str(
        relevance.get(
            "category",
            "irrelevant"
        )
    ).strip().lower()

    return RELEVANCE_WEIGHTS.get(
        category,
        0.0
    )


# ============================================================
# ARTICLE RISK CONTRIBUTION
# ============================================================

def calculate_article_risk_contribution(
    article: dict
) -> float:
    """
    Calculate the weighted financial risk contribution
    of one article.

    Formula:

        Article Risk
        =
        Impact Weight
        × Relevance Weight
        × Freshness Weight

    Only relevant, potentially negative articles
    contribute to financial risk.
    """

    if not isinstance(article, dict):
        return 0.0

    impact = article.get(
        "impact",
        {}
    )

    if not isinstance(impact, dict):
        impact = {}

    relevance = article.get(
        "relevance",
        {}
    )

    if not isinstance(relevance, dict):
        relevance = {}

    impact_level = str(
        impact.get(
            "level",
            "low"
        )
    ).strip().lower()

    impact_direction = str(
        impact.get(
            "direction",
            "neutral"
        )
    ).strip().lower()

    relevance_category = str(
        relevance.get(
            "category",
            "irrelevant"
        )
    ).strip().lower()

    # --------------------------------------------------------
    # Irrelevant articles contribute zero risk
    # --------------------------------------------------------

    if relevance_category == "irrelevant":
        return 0.0

    # --------------------------------------------------------
    # Only potentially negative impact contributes risk
    # --------------------------------------------------------

    if impact_direction != "potentially_negative":
        return 0.0

    # --------------------------------------------------------
    # Impact weight
    # --------------------------------------------------------

    impact_weight = IMPACT_WEIGHTS.get(
        impact_level,
        0
    )

    # --------------------------------------------------------
    # Relevance weight
    # --------------------------------------------------------

    relevance_weight = RELEVANCE_WEIGHTS.get(
        relevance_category,
        0.0
    )

    # --------------------------------------------------------
    # Freshness weight
    # --------------------------------------------------------

    freshness_weight = get_freshness_weight(
        article
    )

    # --------------------------------------------------------
    # Final article risk
    #
    # Impact × Relevance × Freshness
    # --------------------------------------------------------

    risk = (
        impact_weight
        * relevance_weight
        * freshness_weight
    )

    return round(
        risk,
        2
    )


# ============================================================
# COMPANY SUMMARY
# ============================================================

def calculate_company_summary(
    articles: list,
    company_name: str,
    symbol: str
):
    """
    Calculate the complete NLP and risk summary
    for one company.
    """

    articles = safe_articles(
        articles
    )

    # ========================================================
    # INITIALIZE COUNTERS
    # ========================================================

    sentiment_counts = Counter()

    impact_counts = Counter()

    high_risk_articles = []

    medium_risk_articles = []

    negative_articles = []

    positive_articles = []

    total_risk_contribution = 0.0

    high_negative_count = 0

    medium_negative_count = 0

    relevant_negative_count = 0

    # ========================================================
    # FRESHNESS COUNTERS
    # ========================================================

    freshness_counts = {
        "fresh": 0,
        "recent": 0,
        "older": 0,
        "stale": 0,
        "unknown": 0
    }

    # ========================================================
    # PROCESS ARTICLES
    # ========================================================

    for article in articles:

        # ----------------------------------------------------
        # Make sure company/symbol information is present
        # ----------------------------------------------------

        article.setdefault(
            "symbol",
            symbol
        )

        article.setdefault(
            "company_name",
            company_name
        )

        # ----------------------------------------------------
        # FRESHNESS
        # ----------------------------------------------------

        freshness = str(
            article.get(
                "freshness",
                "unknown"
            )
        ).strip().lower()

        if freshness in freshness_counts:

            freshness_counts[
                freshness
            ] += 1

        else:

            freshness_counts[
                "unknown"
            ] += 1

        # ----------------------------------------------------
        # SENTIMENT
        # ----------------------------------------------------

        sentiment = str(
            article.get(
                "sentiment",
                "unknown"
            )
        ).strip().lower()

        sentiment_counts[
            sentiment
        ] += 1

        # ----------------------------------------------------
        # IMPACT
        # ----------------------------------------------------

        impact = article.get(
            "impact",
            {}
        )

        if not isinstance(impact, dict):
            impact = {}

        impact_level = str(
            impact.get(
                "level",
                "low"
            )
        ).strip().lower()

        impact_direction = str(
            impact.get(
                "direction",
                "unknown"
            )
        ).strip().lower()

        impact_counts[
            impact_level
        ] += 1

        # ----------------------------------------------------
        # RELEVANCE
        # ----------------------------------------------------

        relevance = article.get(
            "relevance",
            {}
        )

        if not isinstance(relevance, dict):
            relevance = {}

        relevance_category = str(
            relevance.get(
                "category",
                "irrelevant"
            )
        ).strip().lower()

        # ----------------------------------------------------
        # ARTICLE RISK
        # ----------------------------------------------------

        article_risk = (
            calculate_article_risk_contribution(
                article
            )
        )

        total_risk_contribution += (
            article_risk
        )

        # Store calculated risk directly on the article.
        # This allows the frontend and top-article logic
        # to use the exact same risk value.

        article[
            "risk_contribution"
        ] = article_risk

        # ----------------------------------------------------
        # HIGH NEGATIVE IMPACT
        # ----------------------------------------------------

        if (
            impact_level == "high"
            and
            impact_direction == "potentially_negative"
            and
            relevance_category != "irrelevant"
        ):

            high_risk_articles.append(
                article
            )

            high_negative_count += 1

        # ----------------------------------------------------
        # MEDIUM NEGATIVE IMPACT
        # ----------------------------------------------------

        elif (
            impact_level == "medium"
            and
            impact_direction == "potentially_negative"
            and
            relevance_category != "irrelevant"
        ):

            medium_risk_articles.append(
                article
            )

            medium_negative_count += 1

        # ----------------------------------------------------
        # RELEVANT NEGATIVE SENTIMENT
        #
        # Negative sentiment by itself does NOT automatically
        # mean financial risk.
        # ----------------------------------------------------

        if (
            sentiment == "negative"
            and
            relevance_category != "irrelevant"
        ):

            relevant_negative_count += 1

        # ----------------------------------------------------
        # NEGATIVE ARTICLES
        # ----------------------------------------------------

        if sentiment == "negative":

            negative_articles.append(
                article
            )

        # ----------------------------------------------------
        # POSITIVE / OPPORTUNITY ARTICLES
        #
        # Requires:
        #
        # sentiment = positive
        # AND
        # impact = potentially_positive
        # ----------------------------------------------------

        if (
            sentiment == "positive"
            and
            impact_direction == "potentially_positive"
        ):

            positive_articles.append(
                article
            )

    # ========================================================
    # ARTICLE COUNTS
    # ========================================================

    total_articles = len(
        articles
    )

    positive_count = sentiment_counts.get(
        "positive",
        0
    )

    neutral_count = sentiment_counts.get(
        "neutral",
        0
    )

    negative_count = sentiment_counts.get(
        "negative",
        0
    )

    # ========================================================
    # SENTIMENT SCORE
    #
    # Formula:
    #
    # Positive Articles - Negative Articles
    # -------------------------------------
    #          Total Articles
    #
    # Range:
    # -1 to +1
    # ========================================================

    if total_articles > 0:

        sentiment_score = (
            positive_count
            - negative_count
        ) / total_articles

    else:

        sentiment_score = 0.0

    sentiment_score = round(
        sentiment_score,
        3
    )

    # ========================================================
    # NORMALIZED COMPANY RISK SCORE
    #
    # Formula:
    #
    # Sum of Article Risk Contributions
    # ---------------------------------
    # Number of Articles
    # ========================================================

    if total_articles > 0:

        risk_score = (
            total_risk_contribution
            / total_articles
        )

    else:

        risk_score = 0.0

    risk_score = min(
        round(
            risk_score,
            2
        ),
        100
    )

    # ========================================================
    # COMPANY RISK LEVEL
    # ========================================================

    if risk_score >= 70:

        risk_level = "high"

    elif risk_score >= 30:

        risk_level = "medium"

    else:

        risk_level = "low"

    # ========================================================
    # SORT COMPANY ARTICLES
    # ========================================================

    high_risk_articles.sort(
        key=calculate_article_risk_contribution,
        reverse=True
    )

    medium_risk_articles.sort(
        key=calculate_article_risk_contribution,
        reverse=True
    )

    negative_articles.sort(
        key=lambda article: abs(
            safe_float(
                article.get(
                    "sentiment_score",
                    0
                )
            )
        ),
        reverse=True
    )

    positive_articles.sort(
        key=lambda article: (
            safe_float(
                article.get(
                    "relevance",
                    {}
                ).get(
                    "score",
                    0
                )
                if isinstance(
                    article.get(
                        "relevance",
                        {}
                    ),
                    dict
                )
                else 0
            ),
            safe_float(
                article.get(
                    "sentiment_score",
                    0
                )
            )
        ),
        reverse=True
    )

    # ========================================================
    # COMPANY SUMMARY
    # ========================================================

    return {

        "symbol": symbol,

        "company_name": company_name,

        "article_count": total_articles,

        "sentiment_counts": {

            "positive": positive_count,

            "neutral": neutral_count,

            "negative": negative_count
        },

        "freshness_counts": freshness_counts,

        "impact_counts": {

            "high": impact_counts.get(
                "high",
                0
            ),

            "medium": impact_counts.get(
                "medium",
                0
            ),

            "low": impact_counts.get(
                "low",
                0
            )
        },

        "risk_counts": {

            "high_negative": high_negative_count,

            "medium_negative": medium_negative_count,

            "relevant_negative": relevant_negative_count
        },

        "risk_contribution": round(
            total_risk_contribution,
            2
        ),

        "sentiment_score": sentiment_score,

        "risk_score": risk_score,

        "risk_level": risk_level,

        "high_risk_articles": (
            high_risk_articles
        ),

        "medium_risk_articles": (
            medium_risk_articles
        ),

        "negative_articles": (
            negative_articles
        ),

        "positive_articles": (
            positive_articles
        ),

        # Keep the full analyzed articles available
        # for the frontend freshness chart and company table.

        "articles": articles
    }


# ============================================================
# PORTFOLIO SUMMARY
# ============================================================

def calculate_portfolio_summary(
    company_summaries: list
):
    """
    Calculate the overall portfolio-level
    sentiment and risk summary.
    """

    if not isinstance(
        company_summaries,
        list
    ):

        company_summaries = []

    # ========================================================
    # TOTAL ARTICLE COUNT
    # ========================================================

    total_articles = sum(
        int(
            company.get(
                "article_count",
                0
            ) or 0
        )
        for company in company_summaries
        if isinstance(
            company,
            dict
        )
    )

    # ========================================================
    # TOTAL SENTIMENT COUNTS
    # ========================================================

    total_positive = 0

    total_neutral = 0

    total_negative = 0

    for company in company_summaries:

        if not isinstance(
            company,
            dict
        ):
            continue

        sentiment_counts = company.get(
            "sentiment_counts",
            {}
        )

        if not isinstance(
            sentiment_counts,
            dict
        ):
            sentiment_counts = {}

        total_positive += int(
            sentiment_counts.get(
                "positive",
                0
            ) or 0
        )

        total_neutral += int(
            sentiment_counts.get(
                "neutral",
                0
            ) or 0
        )

        total_negative += int(
            sentiment_counts.get(
                "negative",
                0
            ) or 0
        )

    # ========================================================
    # TOTAL RISK CONTRIBUTION
    # ========================================================

    total_risk_contribution = sum(
        safe_float(
            company.get(
                "risk_contribution",
                0.0
            )
        )
        for company in company_summaries
        if isinstance(
            company,
            dict
        )
    )

    # ========================================================
    # OVERALL SENTIMENT SCORE
    #
    # Positive Articles - Negative Articles
    # -------------------------------------
    #          Total Articles
    # ========================================================

    if total_articles > 0:

        overall_sentiment_score = (
            total_positive
            - total_negative
        ) / total_articles

    else:

        overall_sentiment_score = 0.0

    overall_sentiment_score = round(
        overall_sentiment_score,
        3
    )

    # ========================================================
    # OVERALL SENTIMENT
    # ========================================================

    if overall_sentiment_score > 0.2:

        overall_sentiment = "positive"

    elif overall_sentiment_score < -0.2:

        overall_sentiment = "negative"

    else:

        overall_sentiment = "neutral"

    # ========================================================
    # PORTFOLIO RISK SCORE
    #
    # Sum of Article Risk Contributions
    # ---------------------------------
    # Total Number of Articles
    # ========================================================

    if total_articles > 0:

        portfolio_risk_score = (
            total_risk_contribution
            / total_articles
        )

    else:

        portfolio_risk_score = 0.0

    portfolio_risk_score = min(
        round(
            portfolio_risk_score,
            2
        ),
        100
    )

    # ========================================================
    # PORTFOLIO RISK LEVEL
    # ========================================================

    if portfolio_risk_score >= 70:

        portfolio_risk_level = "high"

    elif portfolio_risk_score >= 30:

        portfolio_risk_level = "medium"

    else:

        portfolio_risk_level = "low"

    # ========================================================
    # PORTFOLIO FRESHNESS
    # ========================================================

    total_fresh = 0
    total_recent = 0
    total_older = 0
    total_stale = 0
    total_unknown = 0

    for company in company_summaries:

        if not isinstance(
            company,
            dict
        ):
            continue

        freshness_counts = company.get(
            "freshness_counts",
            {}
        )

        if not isinstance(
            freshness_counts,
            dict
        ):
            continue

        total_fresh += int(
            freshness_counts.get(
                "fresh",
                0
            ) or 0
        )

        total_recent += int(
            freshness_counts.get(
                "recent",
                0
            ) or 0
        )

        total_older += int(
            freshness_counts.get(
                "older",
                0
            ) or 0
        )

        total_stale += int(
            freshness_counts.get(
                "stale",
                0
            ) or 0
        )

        total_unknown += int(
            freshness_counts.get(
                "unknown",
                0
            ) or 0
        )

    # ========================================================
    # PORTFOLIO SUMMARY
    # ========================================================

    return {

        "total_articles": total_articles,

        "company_count": len(
            company_summaries
        ),

        "sentiment_counts": {

            "positive": total_positive,

            "neutral": total_neutral,

            "negative": total_negative
        },

        "overall_sentiment": (
            overall_sentiment
        ),

        "overall_sentiment_score": (
            overall_sentiment_score
        ),

        "portfolio_risk_score": (
            portfolio_risk_score
        ),

        "portfolio_risk_level": (
            portfolio_risk_level
        ),

        "freshness_counts": {

            "fresh": total_fresh,

            "recent": total_recent,

            "older": total_older,

            "stale": total_stale,

            "unknown": total_unknown
        }
    }


# ============================================================
# GET TOP ARTICLES
# ============================================================

def get_top_articles(
    company_summaries: list,
    article_type: str = "risk",
    limit: int = 5
):
    """
    Return the top risk or positive/opportunity articles.

    Risk ranking:

        Impact × Relevance × Freshness

    Positive ranking:

        Potentially positive impact
        + relevance
        + sentiment score
    """

    # ========================================================
    # VALIDATE LIMIT
    # ========================================================

    try:

        limit = int(limit)

    except (TypeError, ValueError):

        limit = 5

    limit = max(
        1,
        min(limit, 20)
    )

    article_type = str(
        article_type
    ).strip().lower()

    articles = []

    # ========================================================
    # COLLECT ARTICLES
    # ========================================================

    if not isinstance(
        company_summaries,
        list
    ):

        return []

    for company in company_summaries:

        if not isinstance(
            company,
            dict
        ):
            continue

        # ----------------------------------------------------
        # RISK ARTICLES
        # ----------------------------------------------------

        if article_type == "risk":

            risk_articles = company.get(
                "high_risk_articles",
                []
            )

            medium_articles = company.get(
                "medium_risk_articles",
                []
            )

            if isinstance(
                risk_articles,
                list
            ):

                articles.extend(
                    article
                    for article in risk_articles
                    if isinstance(
                        article,
                        dict
                    )
                )

            if isinstance(
                medium_articles,
                list
            ):

                articles.extend(
                    article
                    for article in medium_articles
                    if isinstance(
                        article,
                        dict
                    )
                )

        # ----------------------------------------------------
        # POSITIVE ARTICLES
        # ----------------------------------------------------

        elif article_type == "positive":

            positive_articles = company.get(
                "positive_articles",
                []
            )

            if isinstance(
                positive_articles,
                list
            ):

                articles.extend(
                    article
                    for article in positive_articles
                    if isinstance(
                        article,
                        dict
                    )
                )

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    unique_articles = []

    seen = set()

    for article in articles:

        url = str(
            article.get(
                "url",
                ""
            )
        ).strip()

        title = str(
            article.get(
                "title",
                ""
            )
        ).strip()

        if url:

            key = (
                "url",
                url.lower()
            )

        else:

            key = (
                "title",
                title.lower()
            )

        if key in seen:

            continue

        seen.add(
            key
        )

        unique_articles.append(
            article
        )

    articles = unique_articles

    # ========================================================
    # RISK SORTING
    # ========================================================

    if article_type == "risk":

        def risk_sort_key(article):

            relevance = article.get(
                "relevance",
                {}
            )

            if not isinstance(
                relevance,
                dict
            ):
                relevance = {}

            return (

                # Primary:
                # Actual weighted article risk

                calculate_article_risk_contribution(
                    article
                ),

                # Secondary:
                # Relevance score

                safe_float(
                    relevance.get(
                        "score",
                        0
                    )
                ),

                # Tertiary:
                # Sentiment score

                safe_float(
                    article.get(
                        "sentiment_score",
                        0
                    )
                )
            )

        articles.sort(
            key=risk_sort_key,
            reverse=True
        )

    # ========================================================
    # POSITIVE / OPPORTUNITY SORTING
    # ========================================================

    elif article_type == "positive":

        def positive_sort_key(article):

            impact = article.get(
                "impact",
                {}
            )

            if not isinstance(
                impact,
                dict
            ):
                impact = {}

            relevance = article.get(
                "relevance",
                {}
            )

            if not isinstance(
                relevance,
                dict
            ):
                relevance = {}

            is_positive_impact = (
                impact.get(
                    "direction",
                    ""
                ) == "potentially_positive"
            )

            return (

                # Primary:
                # Potentially positive business impact

                is_positive_impact,

                # Secondary:
                # Relevance

                safe_float(
                    relevance.get(
                        "score",
                        0
                    )
                ),

                # Tertiary:
                # Sentiment score

                safe_float(
                    article.get(
                        "sentiment_score",
                        0
                    )
                )
            )

        articles.sort(
            key=positive_sort_key,
            reverse=True
        )

    # ========================================================
    # UNKNOWN ARTICLE TYPE
    # ========================================================

    else:

        return []

    # ========================================================
    # RETURN TOP ARTICLES
    # ========================================================

    return articles[
        :limit
    ]