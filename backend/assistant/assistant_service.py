"""
QuantRisk AI - Assistant Service

This module is the orchestration layer for the AI Assistant.

Responsibilities:
    1. Receive the user's natural-language question.
    2. Retrieve financial/news evidence for the requested symbols.
    3. Build grounded context from the retrieved evidence.
    4. Send the context to the configured LLM.
    5. Return the generated answer together with source citations.

Important:
    - This module does NOT replace the existing NLP Intelligence pipeline.
    - This module does NOT replace the news collector.
    - This module does NOT contain hardcoded answers.
    - The LLM is instructed to answer only from supplied evidence.
"""

from typing import Any

from backend.assistant.llm import generate_answer
from backend.assistant.prompts import SYSTEM_PROMPT
from backend.assistant.retriever import (
    build_context,
    retrieve_financial_context,
)


# ============================================================
# DEFAULT ASSISTANT SYMBOLS
# ============================================================

DEFAULT_SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "INFY.NS",
]


# ============================================================
# LIMITS
# ============================================================

MAX_SYMBOLS = 10
MAX_ARTICLES_FOR_CONTEXT = 10


# ============================================================
# SYMBOL NORMALIZATION
# ============================================================

def normalize_symbols(symbols: list[str] | None) -> list[str]:
    """
    Clean and normalize the symbols supplied by the frontend.

    If no symbols are supplied, the default QuantRisk symbols
    are used.
    """

    if not symbols:
        return DEFAULT_SYMBOLS.copy()

    cleaned = []

    for symbol in symbols:
        if not isinstance(symbol, str):
            continue

        symbol = symbol.strip().upper()

        if not symbol:
            continue

        if symbol not in cleaned:
            cleaned.append(symbol)

    if not cleaned:
        return DEFAULT_SYMBOLS.copy()

    return cleaned[:MAX_SYMBOLS]


# ============================================================
# CITATION BUILDER
# ============================================================

def build_citations(
    articles: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Convert retrieved articles into frontend-friendly citations.
    """

    citations = []

    for article in articles[:MAX_ARTICLES_FOR_CONTEXT]:

        url = article.get("url")

        if not url:
            continue

        citations.append(
            {
                "title": article.get("title", ""),
                "source": article.get("source", ""),
                "url": url,
                "published_at": article.get("published_at"),
                "symbol": article.get("symbol", ""),
                "freshness": article.get("freshness"),
            }
        )

    return citations


# ============================================================
# MAIN ASSISTANT FUNCTION
# ============================================================

async def answer_question(
    message: str,
    symbols: list[str] | None = None,
) -> dict[str, Any]:
    """
    Process one natural-language AI Assistant question.

    Flow:

        User question
            ↓
        Financial retrieval
            ↓
        NLP analysis
            ↓
        Evidence context
            ↓
        LLM
            ↓
        Answer + citations
    """

    # --------------------------------------------------------
    # Validate question
    # --------------------------------------------------------

    if not isinstance(message, str):
        return {
            "status": "error",
            "answer": "Please enter a valid question.",
            "citations": [],
        }

    message = message.strip()

    if not message:
        return {
            "status": "error",
            "answer": "Please enter a question.",
            "citations": [],
        }

    # --------------------------------------------------------
    # Normalize symbols
    # --------------------------------------------------------

    requested_symbols = normalize_symbols(symbols)

    # --------------------------------------------------------
    # Retrieve financial evidence
    # --------------------------------------------------------

    articles = await retrieve_financial_context(
        message,
        requested_symbols,
    )

    # --------------------------------------------------------
    # Limit evidence sent to the LLM
    # --------------------------------------------------------

    evidence_articles = articles[:MAX_ARTICLES_FOR_CONTEXT]

    # --------------------------------------------------------
    # Build textual evidence context
    # --------------------------------------------------------

    context = build_context(evidence_articles)

    # --------------------------------------------------------
    # Handle no evidence
    # --------------------------------------------------------

    if not evidence_articles:

        return {
            "status": "no_evidence",
            "answer": (
                "I could not find sufficient financial evidence "
                "to answer that question reliably."
            ),
            "citations": [],
            "symbols": requested_symbols,
        }

    # --------------------------------------------------------
    # Build grounded LLM prompt
    # --------------------------------------------------------

    prompt = f"""
{SYSTEM_PROMPT}

USER QUESTION:
{message}

REQUESTED SYMBOLS:
{", ".join(requested_symbols)}

FINANCIAL EVIDENCE:
{context}

IMPORTANT:
Answer the user's question using only the financial evidence
provided above.

If the evidence does not contain enough information to answer
the question reliably, clearly say that sufficient evidence
was not found.

Do not invent facts, numbers, events, news, dates, sources,
citations, or financial claims.
"""

    # --------------------------------------------------------
    # Generate LLM response
    # --------------------------------------------------------

    try:
        answer = await generate_answer(prompt)

    except Exception as exc:

        print(
            "[ASSISTANT SERVICE] LLM request failed:",
            repr(exc),
        )

        return {
            "status": "error",
            "answer": (
                "The AI Assistant could not generate a response "
                "because the language model is currently "
                "unavailable."
            ),
            "citations": build_citations(evidence_articles),
            "symbols": requested_symbols,
        }

    # --------------------------------------------------------
    # Build citations
    # --------------------------------------------------------

    citations = build_citations(evidence_articles)

    # --------------------------------------------------------
    # Return API response
    # --------------------------------------------------------

    return {
        "status": "success",
        "answer": answer,
        "citations": citations,
        "symbols": requested_symbols,
        "evidence_count": len(evidence_articles),
    }