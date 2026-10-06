from backend.news.collector import collect_news, normalize_symbol
from backend.news.company_map import get_company_name
from backend.nlp.pipeline import analyze_article


# ============================================================
# RETRIEVER LIMITS
# ============================================================

# Keep the evidence small because the local Ollama model is
# running on the user's machine and large prompts are slow.
MAX_TOTAL_ARTICLES = 5

# Maximum number of articles collected for one symbol.
ARTICLES_PER_SYMBOL = 3

# Maximum number of characters from one article summary
# included in the LLM context.
MAX_SUMMARY_CHARS = 350


# ============================================================
# RETRIEVE FINANCIAL CONTEXT
# ============================================================

async def retrieve_financial_context(
    message: str,
    symbols: list[str],
):
    """
    Retrieve a small, relevant set of financial news articles.

    The collector returns a dictionary containing an
    'articles' list. The NLP pipeline requires:

        analyze_article(article, company_name, symbol)

    The previous implementation passed only the article,
    which caused the NLP analysis errors.
    """

    del message  # Reserved for future query-specific ranking.

    articles = []

    # --------------------------------------------------------
    # Validate symbols
    # --------------------------------------------------------

    clean_symbols = []

    for symbol in symbols or []:

        try:
            normalized = normalize_symbol(symbol)

            if normalized and normalized not in clean_symbols:
                clean_symbols.append(normalized)

        except Exception as error:

            print(
                f"[ASSISTANT RETRIEVER] "
                f"Symbol normalization failed for {symbol}: {error}"
            )

    # --------------------------------------------------------
    # Retrieve news
    # --------------------------------------------------------

    for symbol in clean_symbols:

        if len(articles) >= MAX_TOTAL_ARTICLES:
            break

        try:

            collected = collect_news(
                symbol,
                count=ARTICLES_PER_SYMBOL
            )

            if not isinstance(collected, dict):

                print(
                    f"[ASSISTANT RETRIEVER] "
                    f"Unexpected collector response for {symbol}."
                )

                continue

            raw_articles = collected.get(
                "articles",
                []
            )

            if not isinstance(raw_articles, list):
                raw_articles = []

            # ------------------------------------------------
            # Company name required by analyze_article()
            # ------------------------------------------------

            try:

                company_name = get_company_name(
                    symbol
                )

            except Exception:

                company_name = symbol

            # ------------------------------------------------
            # Analyse each article
            # ------------------------------------------------

            for article in raw_articles:

                if len(articles) >= MAX_TOTAL_ARTICLES:
                    break

                if not isinstance(article, dict):
                    continue

                try:

                    analysis = analyze_article(
                        article,
                        company_name,
                        symbol
                    )

                except Exception as error:

                    print(
                        f"[ASSISTANT RETRIEVER] "
                        f"NLP analysis failed for {symbol}: {error}"
                    )

                    analysis = {}

                articles.append({

                    "symbol": symbol,

                    "company_name": company_name,

                    "title": article.get(
                        "title",
                        ""
                    ),

                    "summary": article.get(
                        "summary",
                        ""
                    ),

                    "url": article.get(
                        "url",
                        ""
                    ),

                    "source": article.get(
                        "source",
                        ""
                    ),

                    "published_at": article.get(
                        "published_at"
                    ),

                    "analysis": analysis

                })

        except Exception as error:

            print(
                f"[ASSISTANT RETRIEVER] "
                f"News retrieval failed for {symbol}: {error}"
            )

            continue

    return articles


# ============================================================
# BUILD COMPACT LLM CONTEXT
# ============================================================

def build_context(
    articles: list[dict]
):
    """
    Convert retrieved articles into a compact evidence block.

    IMPORTANT:
    Do not send the entire NLP object to Ollama.

    The previous implementation created a much larger prompt
    than necessary. The local llama3.2:3b model timed out when
    given the larger context.

    Only evidence useful for answering the question is included.
    """

    if not articles:
        return ""

    context = []

    for index, article in enumerate(
        articles[:MAX_TOTAL_ARTICLES],
        start=1
    ):

        analysis = article.get(
            "analysis",
            {}
        )

        if not isinstance(
            analysis,
            dict
        ):
            analysis = {}

        title = str(
            article.get(
                "title",
                ""
            )
        ).strip()

        summary = str(
            article.get(
                "summary",
                ""
            )
        ).strip()

        summary = summary[
            :MAX_SUMMARY_CHARS
        ]

        source = str(
            article.get(
                "source",
                ""
            )
        ).strip()

        published_at = str(
            article.get(
                "published_at",
                ""
            )
        ).strip()

        symbol = str(
            article.get(
                "symbol",
                ""
            )
        ).strip()

        sentiment = str(
            analysis.get(
                "sentiment",
                "unknown"
            )
        )

        impact = analysis.get(
            "impact",
            {}
        )

        if not isinstance(
            impact,
            dict
        ):
            impact = {}

        impact_level = str(
            impact.get(
                "level",
                "unknown"
            )
        )

        impact_direction = str(
            impact.get(
                "direction",
                "unknown"
            )
        )

        insight = str(
            analysis.get(
                "insight",
                ""
            )
        ).strip()

        insight = insight[:250]

        context.append(
            f"""
SOURCE {index}
Company/Symbol: {symbol}
Title: {title}
Publisher: {source}
Published: {published_at}
Summary: {summary}
Sentiment: {sentiment}
Impact: {impact_level} / {impact_direction}
Insight: {insight}
""".strip()
        )

    return "\n\n".join(
        context
    )