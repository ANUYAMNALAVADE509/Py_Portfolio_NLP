from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.nlp.pipeline import analyze_text, analyze_article

from backend.nlp.portfolio import (
    calculate_company_summary,
    calculate_portfolio_summary,
    get_top_articles
)

from backend.news.collector import collect_news
from backend.news.company_map import get_company_name


router = APIRouter()


# ============================================================
# REQUEST MODEL
# ============================================================

class NewsAnalysisRequest(BaseModel):
    text: str


# ============================================================
# NLP HEALTH CHECK
# ============================================================

@router.get("/health")
def nlp_health():

    return {
        "status": "success",
        "service": "NLP Intelligence",
        "message": "NLP service is running"
    }


# ============================================================
# TEXT ANALYSIS
# ============================================================

@router.post("/analyze")
def analyze_news(request: NewsAnalysisRequest):

    if not request.text or not request.text.strip():

        return {
            "status": "error",
            "message": "Please provide text for analysis."
        }

    result = analyze_text(request.text)

    return result


# ============================================================
# COMPANY NEWS
# ============================================================

@router.get("/news/{symbol}")
def get_news(
    symbol: str,
    count: int = Query(default=10, ge=1, le=50)
):

    # --------------------------------------------------------
    # Clean the symbol received from the frontend
    # --------------------------------------------------------

    symbol = symbol.strip().upper()

    if not symbol:

        return {
            "status": "error",
            "message": "Stock symbol is required."
        }

    print(
        f"[NLP NEWS] symbol={symbol} count={count}"
    )

    # --------------------------------------------------------
    # Get readable company name
    # --------------------------------------------------------

    company_name = get_company_name(symbol)

    # --------------------------------------------------------
    # IMPORTANT:
    # Pass BOTH symbol and count to the news collector.
    #
    # This makes sure:
    #
    # RELIANCE.NS + 5
    #
    # and
    #
    # TCS.NS + 20
    #
    # are treated as different requests.
    # --------------------------------------------------------

    try:

        news_result = collect_news(
            symbol,
            count
        )

    except Exception as error:

        print(
            f"[NLP NEWS ERROR] "
            f"{symbol}: {error}"
        )

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "symbol": symbol,
                "message": str(error)
            }
        )

    # --------------------------------------------------------
    # News collector failure
    # --------------------------------------------------------

    if news_result.get("status") != "success":

        return news_result

    # --------------------------------------------------------
    # Analyze every collected article
    # --------------------------------------------------------

    analyzed_articles = []

    for article in news_result.get("articles", []):

        try:

            analyzed_article = analyze_article(
                article=article,
                company_name=company_name,
                symbol=symbol
            )

            if analyzed_article:

                analyzed_articles.append(
                    analyzed_article
                )

        except Exception as error:

            print(
                f"[NLP ARTICLE ERROR] "
                f"{symbol}: {error}"
            )

    # --------------------------------------------------------
    # Final company-news response
    # --------------------------------------------------------

    response_data = {
        "status": "success",
        "symbol": symbol,
        "company_name": company_name,
        "requested_article_count": count,
        "article_count": len(analyzed_articles),
        "articles": analyzed_articles
    }

    # --------------------------------------------------------
    # Prevent browser/proxy caching
    # --------------------------------------------------------

    return JSONResponse(
        content=response_data,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


# ============================================================
# PORTFOLIO NEWS
# ============================================================

@router.get("/portfolio-news")
def get_portfolio_news(
    symbols: str = Query(...),
    count: int = Query(default=5, ge=1, le=20)
):

    # ========================================================
    # 1. CLEAN SELECTED SYMBOLS
    # ========================================================

    symbol_list = [
        symbol.strip().upper()
        for symbol in symbols.split(",")
        if symbol.strip()
    ]

    if not symbol_list:

        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": "At least one stock symbol is required."
            }
        )

    # ========================================================
    # DEBUG INFORMATION
    # ========================================================
    #
    # This is important for checking whether the frontend
    # selection is reaching FastAPI correctly.
    #
    # Example:
    #
    # [NLP PORTFOLIO] symbols=['TCS.NS'] count=20
    #
    # ========================================================

    print(
        f"[NLP PORTFOLIO] "
        f"symbols={symbol_list} "
        f"count={count}"
    )

    # ========================================================
    # IMPORTANT:
    #
    # These lists are created INSIDE the request.
    #
    # Therefore old company data cannot accidentally remain
    # from a previous API request.
    # ========================================================

    company_summaries = []

    collection_errors = []

    all_articles = []

    # ========================================================
    # 2. PROCESS EACH SELECTED COMPANY
    # ========================================================

    for symbol in symbol_list:

        try:

            # ------------------------------------------------
            # Company name
            # ------------------------------------------------

            company_name = get_company_name(symbol)

            print(
                f"[NLP PORTFOLIO] "
                f"Collecting news: "
                f"symbol={symbol}, "
                f"count={count}"
            )

            # ------------------------------------------------
            # IMPORTANT:
            #
            # Pass the CURRENT symbol and CURRENT count.
            # ------------------------------------------------

            news_result = collect_news(
                symbol,
                count
            )

            # ------------------------------------------------
            # Check collector result
            # ------------------------------------------------

            if news_result.get("status") != "success":

                error_message = news_result.get(
                    "message",
                    "Unable to collect news."
                )

                print(
                    f"[NLP COLLECTION ERROR] "
                    f"{symbol}: {error_message}"
                )

                collection_errors.append({
                    "symbol": symbol,
                    "message": error_message
                })

                continue

            raw_articles = news_result.get(
                "articles",
                []
            )

            print(
                f"[NLP PORTFOLIO] "
                f"{symbol}: "
                f"received {len(raw_articles)} articles"
            )

            # ------------------------------------------------
            # 3. NLP ANALYSIS
            # ------------------------------------------------

            analyzed_articles = []

            for article in raw_articles:

                try:

                    analyzed_article = analyze_article(
                        article=article,
                        company_name=company_name,
                        symbol=symbol
                    )

                    if analyzed_article:

                        # ------------------------------------
                        # Keep company information attached
                        # to every analyzed article.
                        # ------------------------------------

                        analyzed_article["symbol"] = symbol

                        analyzed_article[
                            "company_name"
                        ] = company_name

                        analyzed_articles.append(
                            analyzed_article
                        )

                except Exception as article_error:

                    print(
                        f"[NLP ARTICLE ERROR] "
                        f"{symbol}: "
                        f"{article_error}"
                    )

                    # One bad article should not prevent
                    # the remaining articles from being
                    # analyzed.
                    continue

            # ------------------------------------------------
            # 4. COMPANY SUMMARY
            # ------------------------------------------------

            company_summary = calculate_company_summary(
                articles=analyzed_articles,
                company_name=company_name,
                symbol=symbol
            )

            # ------------------------------------------------
            # IMPORTANT:
            #
            # The frontend needs the analyzed articles inside
            # the company summary for:
            #
            # - News Freshness
            # - Company-level news
            # - Article information
            # ------------------------------------------------

            company_summary["articles"] = analyzed_articles

            company_summary["symbol"] = symbol

            company_summary[
                "company_name"
            ] = company_name

            company_summary[
                "article_count"
            ] = len(analyzed_articles)

            # ------------------------------------------------
            # Add current company summary
            # ------------------------------------------------

            company_summaries.append(
                company_summary
            )

            # ------------------------------------------------
            # Add current articles to portfolio-level list
            # ------------------------------------------------

            all_articles.extend(
                analyzed_articles
            )

        except Exception as company_error:

            print(
                f"[NLP COMPANY ERROR] "
                f"{symbol}: "
                f"{company_error}"
            )

            collection_errors.append({
                "symbol": symbol,
                "message": str(company_error)
            })

            continue

    # ========================================================
    # 5. CHECK WHETHER ANY COMPANY WAS SUCCESSFULLY PROCESSED
    # ========================================================

    if not company_summaries:

        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": (
                    "Unable to collect news for any "
                    "of the provided symbols."
                ),
                "requested_symbols": symbol_list,
                "requested_article_count": count,
                "collection_errors": collection_errors
            },
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )

    # ========================================================
    # 6. PORTFOLIO SUMMARY
    # ========================================================

    try:

        portfolio_summary = calculate_portfolio_summary(
            company_summaries
        )

    except Exception as portfolio_error:

        print(
            f"[NLP PORTFOLIO SUMMARY ERROR] "
            f"{portfolio_error}"
        )

        portfolio_summary = {
            "total_articles": len(all_articles),
            "message": (
                "Portfolio summary could not be calculated."
            )
        }

    # ========================================================
    # 7. TOP RISK ARTICLES
    # ========================================================

    try:

        top_risk_articles = get_top_articles(
            company_summaries,
            article_type="risk",
            limit=5
        )

    except Exception as risk_error:

        print(
            f"[NLP TOP RISK ERROR] "
            f"{risk_error}"
        )

        top_risk_articles = []

    # ========================================================
    # 8. TOP POSITIVE ARTICLES
    # ========================================================

    try:

        top_positive_articles = get_top_articles(
            company_summaries,
            article_type="positive",
            limit=5
        )

    except Exception as positive_error:

        print(
            f"[NLP TOP POSITIVE ERROR] "
            f"{positive_error}"
        )

        top_positive_articles = []

    # ========================================================
    # 9. FINAL RESPONSE
    # ========================================================

    response_data = {

        "status": "success",

        # ----------------------------------------------------
        # REQUEST INFORMATION
        # ----------------------------------------------------

        "requested_symbols": symbol_list,

        "requested_article_count": count,

        # ----------------------------------------------------
        # ACTUAL DATA RETURNED
        # ----------------------------------------------------

        "total_articles": len(all_articles),

        # ----------------------------------------------------
        # MAIN NLP RESULTS
        # ----------------------------------------------------

        "portfolio_summary": portfolio_summary,

        "company_summaries": company_summaries,

        # ----------------------------------------------------
        # TOP ARTICLES
        # ----------------------------------------------------

        "top_risk_articles": top_risk_articles,

        "top_positive_articles": top_positive_articles,

        # ----------------------------------------------------
        # COLLECTION WARNINGS
        # ----------------------------------------------------

        "collection_errors": collection_errors
    }

    # ========================================================
    # 10. PREVENT CACHING
    # ========================================================

    return JSONResponse(
        content=response_data,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )