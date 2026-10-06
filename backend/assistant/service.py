from backend.assistant.llm import generate_answer
from backend.assistant.prompts import SYSTEM_PROMPT
from backend.assistant.retriever import (
    build_context,
    retrieve_financial_context,
)


# ============================================================
# Default symbols
# ============================================================

DEFAULT_SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
]


# ============================================================
# Determine symbols
# ============================================================

def normalize_symbols(
    symbols: list[str] | None,
) -> list[str]:

    if not symbols:
        return DEFAULT_SYMBOLS.copy()

    result = []

    for symbol in symbols:

        if not isinstance(symbol, str):
            continue

        symbol = symbol.strip().upper()

        if not symbol:
            continue

        if symbol not in result:
            result.append(symbol)

    return result or DEFAULT_SYMBOLS.copy()


# ============================================================
# Build assistant prompt
# ============================================================

def build_assistant_prompt(
    message: str,
    context: str,
) -> str:

    return f"""
{SYSTEM_PROMPT}

USER QUESTION:
{message.strip()}

FINANCIAL EVIDENCE:
{context}

IMPORTANT ANSWERING RULES:

- Answer the user's actual question directly.
- Do not restrict the user to predefined questions.
- Use the supplied evidence for current financial claims.
- Do not invent missing facts.
- Do not invent prices, dates, events, companies, citations,
  or financial statistics.
- If the supplied evidence is insufficient for a current claim,
  clearly say that it could not be verified.
- Separate reported facts from your interpretation.
- Keep the answer understandable to a beginner unless the
  user requests technical detail.
- Do not give personalised buy/sell recommendations.
- When citing current information, refer to the supplied
  sources.
- Do not claim that you searched a source if the source is not
  present in the supplied evidence.

Return a useful natural-language answer.
""".strip()


# ============================================================
# Main assistant function
# ============================================================

async def answer_question(
    message: str,
    symbols: list[str] | None = None,
):

    if not isinstance(message, str):
        raise ValueError(
            "The question must be text."
        )

    message = message.strip()

    if not message:
        raise ValueError(
            "Please enter a question."
        )

    normalized_symbols = normalize_symbols(
        symbols
    )

    # --------------------------------------------------------
    # Retrieve current financial evidence.
    #
    # Five articles per symbol keeps the assistant responsive.
    # --------------------------------------------------------

    articles = await retrieve_financial_context(
        message=message,
        symbols=normalized_symbols,
        max_articles_per_symbol=5,
    )

    # --------------------------------------------------------
    # Build compact evidence context.
    # --------------------------------------------------------

    context = build_context(
        articles,
        max_articles=8,
    )

    # --------------------------------------------------------
    # Build grounded LLM prompt.
    # --------------------------------------------------------

    prompt = build_assistant_prompt(
        message=message,
        context=context,
    )

    # --------------------------------------------------------
    # Generate local Llama response.
    # --------------------------------------------------------

    answer = await generate_answer(
        prompt
    )

    # --------------------------------------------------------
    # Return citations separately so the frontend can render
    # source cards.
    # --------------------------------------------------------

    citations = []

    for article in articles[:8]:

        url = article.get("url")

        if not url:
            continue

        citations.append(
            {
                "title": article.get(
                    "title",
                    "",
                ),

                "source": article.get(
                    "source",
                    "",
                ),

                "url": url,

                "published_at": article.get(
                    "published_at",
                ),

                "symbol": article.get(
                    "symbol",
                    "",
                ),

                "freshness": article.get(
                    "freshness",
                ),
            }
        )

    return {
        "answer": answer,
        "citations": citations,
        "symbols": normalized_symbols,
        "evidence_count": len(articles),
    }