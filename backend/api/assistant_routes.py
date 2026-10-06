from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel, Field

from backend.assistant.llm import (
    check_ollama,
    generate_answer,
)
from backend.assistant.prompts import SYSTEM_PROMPT
from backend.assistant.retriever import (
    build_context,
    retrieve_financial_context,
)


router = APIRouter()


# ============================================================
# REQUEST MODEL
# ============================================================

class AssistantRequest(BaseModel):

    message: str

    symbols: list[str] = Field(
        default_factory=list
    )

    history: list[dict] = Field(
        default_factory=list
    )


# ============================================================
# QUERY CLASSIFICATION
# ============================================================

def classify_query(
    message: str
) -> dict:

    text = message.lower().strip()

    # --------------------------------------------------------
    # Current-information indicators
    # --------------------------------------------------------

    current_terms = [

        "today",
        "todays",
        "today's",
        "now",
        "currently",
        "latest",
        "recent",
        "recently",
        "this week",
        "this month",
        "yesterday",

        "news",
        "headline",
        "headlines",

        "fell",
        "fall",
        "fallen",
        "declined",
        "decline",
        "dropped",
        "drop",
        "rose",
        "rising",
        "risen",
        "surged",
        "surge",

        "movement",
        "underperforming",
        "underperformance",

        "announcement",
        "announcements",

        "quarterly results",
        "results",

        "investment",
        "investments",

        "sip trends",
        "mutual fund trends",

        "market decline",
        "market movement",

        "events",
        "sentiment"
    ]

    requires_current = any(
        term in text
        for term in current_terms
    )

    # --------------------------------------------------------
    # Risk / finance education
    # --------------------------------------------------------

    risk_terms = [

        "risk",
        "var",
        "value at risk",
        "cvar",
        "beta",
        "volatility",
        "diversification",
        "drawdown",
        "sharpe ratio"
    ]

    if any(
        term in text
        for term in risk_terms
    ):

        if requires_current:

            intent = "CURRENT_RISK"

        else:

            intent = "RISK_EXPLANATION"

    elif (
        "compare" in text
        or "difference between" in text
    ):

        intent = "COMPARISON"

    elif (
        "portfolio" in text
        and requires_current
    ):

        intent = "PORTFOLIO_ANALYSIS"

    elif (
        "portfolio" in text
    ):

        intent = "PORTFOLIO_QUESTION"

    elif (
        "news" in text
        or "headline" in text
    ):

        intent = "STOCK_NEWS"

    elif (
        "market" in text
        and requires_current
    ):

        intent = "MARKET_NEWS"

    elif (
        "sip" in text
    ):

        intent = "SIP"

    elif (
        "mutual fund" in text
    ):

        intent = "MUTUAL_FUNDS"

    elif (
        "result" in text
        or "earnings" in text
    ):

        intent = "QUARTERLY_RESULTS"

    elif (
        "investment" in text
    ):

        intent = "INVESTMENT"

    elif requires_current:

        intent = "CURRENT_FINANCIAL"

    else:

        intent = "GENERAL_FINANCE"

    return {

        "intent": intent,

        "requires_current": requires_current
    }


# ============================================================
# SYMBOL DETECTION
# ============================================================

KNOWN_SYMBOLS = {

    "reliance":
        "RELIANCE.NS",

    "reliance industries":
        "RELIANCE.NS",

    "tcs":
        "TCS.NS",

    "tata consultancy services":
        "TCS.NS",

    "infosys":
        "INFY.NS",

    "infy":
        "INFY.NS",

    "hdfc bank":
        "HDFCBANK.NS",

    "hdfcbank":
        "HDFCBANK.NS",

    "icici bank":
        "ICICIBANK.NS",

    "icicibank":
        "ICICIBANK.NS",
}


def detect_symbols(
    message: str,
    requested_symbols: list[str]
) -> list[str]:

    if requested_symbols:

        return list(
            dict.fromkeys(
                symbol.strip().upper()
                for symbol in requested_symbols
                if isinstance(
                    symbol,
                    str
                ) and symbol.strip()
            )
        )

    text = message.lower()

    detected = []

    # Longer company names first.
    for name, symbol in sorted(
        KNOWN_SYMBOLS.items(),
        key=lambda item: len(item[0]),
        reverse=True
    ):

        if name in text:

            if symbol not in detected:
                detected.append(symbol)

    return detected


# ============================================================
# COMPACT CONVERSATION HISTORY
# ============================================================

def build_history(
    history: list[dict]
) -> str:

    if not history:
        return ""

    lines = []

    for item in history[-6:]:

        if not isinstance(
            item,
            dict
        ):
            continue

        role = item.get(
            "role",
            ""
        )

        content = item.get(
            "content",
            ""
        )

        if role not in {
            "user",
            "assistant"
        }:
            continue

        if not isinstance(
            content,
            str
        ):
            continue

        content = content.strip()

        if not content:
            continue

        # Keep conversation context compact.
        content = content[:450]

        lines.append(
            f"{role.upper()}: {content}"
        )

    return "\n".join(
        lines
    )


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
async def assistant_health():

    ollama = await check_ollama()

    if (
        ollama.get("available")
        and ollama.get("model_available")
    ):

        return {

            "status": "success",

            "assistant": "available",

            "ollama": ollama
        }

    return {

        "status": "error",

        "assistant": "unavailable",

        "ollama": ollama
    }


# ============================================================
# CHAT
# ============================================================

@router.post("/chat")
async def assistant_chat(
    request: AssistantRequest
):

    message = request.message.strip()

    if not message:

        return {

            "status": "error",

            "answer": "",

            "citations": [],

            "symbols": [],

            "evidence_count": 0,

            "message": (
                "Please enter a question."
            )
        }

    classification = classify_query(
        message
    )

    intent = classification[
        "intent"
    ]

    requires_current = classification[
        "requires_current"
    ]

    # --------------------------------------------------------
    # Detect relevant symbols
    # --------------------------------------------------------

    symbols = detect_symbols(
        message,
        request.symbols
    )

    # --------------------------------------------------------
    # Current queries only:
    # retrieve external evidence.
    # --------------------------------------------------------

    articles = []

    if requires_current:

        # Preserve the previous default behaviour when a
        # current question does not explicitly mention a
        # supported company.
        if not symbols:

            symbols = [
                "RELIANCE.NS",
                "TCS.NS",
                "INFY.NS"
            ]

        articles = (
            await retrieve_financial_context(
                message,
                symbols
            )
        )

    # --------------------------------------------------------
    # Build evidence
    # --------------------------------------------------------

    context = build_context(
        articles
    )

    # --------------------------------------------------------
    # Current query with no evidence
    # --------------------------------------------------------

    if requires_current and not articles:

        return {

            "status": "success",

            "answer": (
                "I couldn't retrieve sufficient "
                "current financial evidence to verify "
                "that information. I don't want to "
                "guess or present an unverified claim "
                "as fact."
            ),

            "citations": [],

            "symbols": symbols,

            "evidence_count": 0,

            "intent": intent
        }

    # --------------------------------------------------------
    # Conversation history
    # --------------------------------------------------------

    history = build_history(
        request.history
    )

    # --------------------------------------------------------
    # Build compact LLM prompt
    # --------------------------------------------------------

    prompt_parts = [

        f"INTENT: {intent}",

        f"USER QUESTION:\n{message}"
    ]

    if history:

        prompt_parts.append(
            "RECENT CONVERSATION:\n"
            + history
        )

    if requires_current:

        prompt_parts.append(
            "VERIFIED FINANCIAL EVIDENCE:\n"
            + context
        )

        prompt_parts.append(
            "Answer current claims only from "
            "the verified evidence above. "
            "Refer to sources by their SOURCE number."
        )

    else:

        prompt_parts.append(
            "This is not a current-information "
            "request. Answer the educational or "
            "conceptual question directly."
        )

    prompt = "\n\n".join(
        prompt_parts
    )

    # --------------------------------------------------------
    # Generate answer
    # --------------------------------------------------------

    try:

        answer = await generate_answer(
            prompt,
            system_prompt=SYSTEM_PROMPT
        )

    except RuntimeError as error:

        return {

            "status": "error",

            "answer": "",

            "citations": [],

            "symbols": symbols,

            "evidence_count": len(
                articles
            ),

            "intent": intent,

            "message": (
                "The AI Assistant could not "
                "generate a response."
            ),

            "detail": str(error)
        }

    # --------------------------------------------------------
    # Citations
    # --------------------------------------------------------

    citations = []

    for article in articles:

        url = article.get(
            "url",
            ""
        )

        if not url:
            continue

        citations.append({

            "title": article.get(
                "title",
                ""
            ),

            "source": article.get(
                "source",
                ""
            ),

            "url": url,

            "published_at": article.get(
                "published_at"
            ),

            "symbol": article.get(
                "symbol",
                ""
            )
        })

    return {

        "status": "success",

        "answer": answer,

        "citations": citations,

        "symbols": symbols,

        "evidence_count": len(
            articles
        ),

        "intent": intent
    }


# ============================================================
# IMAGE ENDPOINT
# ============================================================

@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...)
):

    contents = await file.read()

    if not contents:

        return {

            "status": "error",

            "answer": (
                "The uploaded image is empty."
            ),

            "citations": []
        }

    # Keep your existing OCR integration point.
    # Do not fabricate OCR results.
    return {

        "status": "success",

        "message": (
            "Image received successfully."
        ),

        "filename": file.filename
    }