from transformers import pipeline

from backend.nlp.events import detect_event
from backend.nlp.impact import assess_impact
from backend.nlp.insight import generate_insight
from backend.nlp.intelligence import (
    detect_risk_context,
    detect_risk_terms,
    detect_topic,
)
from backend.nlp.ner import extract_entities
from backend.nlp.relevance import classify_relevance

# ============================================================
# LOAD FINBERT ONCE
# ============================================================

try:

    sentiment_model = pipeline(
        "text-classification",
        model="ProsusAI/finbert"
    )

    print(
        "[NLP PIPELINE] FinBERT loaded successfully."
    )

except Exception as error:

    sentiment_model = None

    print(
        "[NLP PIPELINE ERROR] "
        f"Unable to load FinBERT: {error}"
    )


# ============================================================
# SAFE TEXT HELPER
# ============================================================

def clean_text(value) -> str:
    """
    Safely convert a value into clean text.
    """

    if value is None:
        return ""

    try:
        return str(value).strip()

    except Exception:
        return ""


# ============================================================
# BASIC SENTIMENT ANALYSIS
# ============================================================

def analyze_text(text: str):
    """
    Perform financial sentiment analysis using FinBERT.
    """

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    if not isinstance(text, str):

        return {
            "status": "error",
            "message": "Text must be a string."
        }

    text = text.strip()

    if not text:

        return {
            "status": "error",
            "message": "News text cannot be empty."
        }

    # --------------------------------------------------------
    # Check FinBERT
    # --------------------------------------------------------

    if sentiment_model is None:

        return {
            "status": "error",
            "message": (
                "FinBERT sentiment model is not available."
            )
        }

    # --------------------------------------------------------
    # Run FinBERT
    # --------------------------------------------------------

    try:

        result = sentiment_model(
            text,
            truncation=True,
            max_length=512
        )[0]

        sentiment = clean_text(
            result.get(
                "label",
                "unknown"
            )
        ).lower()

        sentiment_score = float(
            result.get(
                "score",
                0.0
            )
        )

        return {

            "status": "success",

            "text": text,

            "sentiment": sentiment,

            "sentiment_score": sentiment_score
        }

    except Exception as error:

        print(
            "[NLP SENTIMENT ERROR] "
            f"{error}"
        )

        return {

            "status": "error",

            "message": (
                f"Sentiment analysis failed: "
                f"{error!s}"
            ),

            "sentiment": "unknown",

            "sentiment_score": 0.0
        }


# ============================================================
# EMPTY ARTICLE RESPONSE
# ============================================================

def create_empty_article_analysis(
    article: dict
):
    """
    Return a safe NLP structure when an article does not
    contain enough text for analysis.
    """

    empty_relevance = {

        "category": "irrelevant",

        "level": "low",

        "score": 0.0,

        "matched_terms": [],

        "reason": "No article text available."
    }

    empty_impact = {

        "level": "low",

        "direction": "unknown",

        "reason": "No article text available."
    }

    return {

        **article,

        "sentiment": "unknown",

        "sentiment_score": 0.0,

        "entities": [],

        "risk_terms": {},

        "risk_context": {},

        "topics": [],

        "events": [],

        "relevance": empty_relevance,

        "entity_relevance": empty_relevance,

        "impact": empty_impact,

        "insight": (
            "No sufficient article information "
            "was available."
        )
    }


# ============================================================
# COMPLETE ARTICLE ANALYSIS
# ============================================================

def analyze_article(
    article: dict,
    company_name: str,
    symbol: str
):
    """
    Perform complete financial NLP analysis on one article.

    Pipeline:

        Article
          ↓
        FinBERT Sentiment
          ↓
        Risk Terms
          ↓
        Risk Context
          ↓
        Topic Detection
          ↓
        Named Entity Recognition
          ↓
        Company Relevance
          ↓
        Event Detection
          ↓
        Financial Impact
          ↓
        Human-readable Insight
    """

    # ========================================================
    # VALIDATE ARTICLE
    # ========================================================

    if not isinstance(
        article,
        dict
    ):

        return {

            "symbol": symbol,

            "company_name": company_name,

            "title": "",

            "summary": "",

            "url": "",

            "source": "",

            "published_at": "",

            "age_hours": None,

            "freshness": "unknown",

            "sentiment": "unknown",

            "sentiment_score": 0.0,

            "entities": [],

            "risk_terms": {},

            "risk_context": {},

            "topics": [],

            "events": [],

            "relevance": {

                "category": "irrelevant",

                "level": "low",

                "score": 0.0,

                "matched_terms": [],

                "reason": "Invalid article."
            },

            "entity_relevance": {

                "category": "irrelevant",

                "level": "low",

                "score": 0.0,

                "matched_terms": [],

                "reason": "Invalid article."
            },

            "impact": {

                "level": "low",

                "direction": "unknown",

                "reason": "Invalid article."
            },

            "insight": (
                "The article could not be analyzed "
                "because the article data was invalid."
            )
        }

    # ========================================================
    # COPY ARTICLE
    # ========================================================

    # Do not mutate the original collector object directly.
    analyzed_article = dict(
        article
    )

    # ========================================================
    # ENSURE BASIC COMPANY INFORMATION
    # ========================================================

    analyzed_article[
        "symbol"
    ] = symbol

    analyzed_article[
        "company_name"
    ] = company_name

    # ========================================================
    # ARTICLE TEXT
    # ========================================================

    title = clean_text(
        analyzed_article.get(
            "title",
            ""
        )
    )

    summary = clean_text(
        analyzed_article.get(
            "summary",
            ""
        )
    )

    # --------------------------------------------------------
    # Use both title and summary for NLP.
    # --------------------------------------------------------

    if title and summary:

        text = (
            f"{title}. {summary}"
        ).strip()

    elif title:

        text = title

    else:

        text = summary

    # ========================================================
    # EMPTY ARTICLE HANDLING
    # ========================================================

    if not text:

        return create_empty_article_analysis(
            analyzed_article
        )

    # ========================================================
    # 1. SENTIMENT
    # ========================================================

    sentiment_result = analyze_text(
        text
    )

    if sentiment_result.get(
        "status"
    ) == "success":

        sentiment = sentiment_result.get(
            "sentiment",
            "unknown"
        )

        sentiment_score = float(
            sentiment_result.get(
                "sentiment_score",
                0.0
            )
        )

    else:

        sentiment = "unknown"

        sentiment_score = 0.0

        print(
            "[NLP PIPELINE] "
            f"Sentiment failed for {symbol}: "
            f"{sentiment_result.get('message', '')}"
        )

    # ========================================================
    # 2. RISK TERMS
    # ========================================================

    try:

        risk_terms = detect_risk_terms(
            text
        )

    except Exception as error:

        print(
            "[NLP RISK TERMS ERROR] "
            f"{symbol}: {error}"
        )

        risk_terms = {}

    # ========================================================
    # 3. RISK CONTEXT
    # ========================================================

    try:

        risk_context = detect_risk_context(
            text
        )

    except Exception as error:

        print(
            "[NLP RISK CONTEXT ERROR] "
            f"{symbol}: {error}"
        )

        risk_context = {}

    # ========================================================
    # 4. TOPIC DETECTION
    # ========================================================

    try:

        topics = detect_topic(
            text
        )

    except Exception as error:

        print(
            "[NLP TOPIC ERROR] "
            f"{symbol}: {error}"
        )

        topics = []

    # ========================================================
    # 5. NAMED ENTITY RECOGNITION
    # ========================================================

    try:

        entities = extract_entities(
            text
        )

    except Exception as error:

        print(
            "[NLP NER ERROR] "
            f"{symbol}: {error}"
        )

        entities = []

    # ========================================================
    # 6. COMPANY / BUSINESS RELEVANCE
    # ========================================================

    try:

        url = clean_text(
            analyzed_article.get(
                "url",
                ""
            )
        )

        relevance = classify_relevance(

            text=text,

            symbol=symbol,

            entities=entities,

            url=url
        )

    except Exception as error:

        print(
            "[NLP RELEVANCE ERROR] "
            f"{symbol}: {error}"
        )

        relevance = {

            "category": "irrelevant",

            "level": "low",

            "score": 0.0,

            "matched_terms": [],

            "reason": (
                "Relevance analysis failed."
            )
        }

    # ========================================================
    # ENTITY RELEVANCE
    # ========================================================

    # Keep this field for compatibility with your
    # existing frontend/API structure.

    entity_match = dict(
        relevance
    )

    # ========================================================
    # 7. EVENT DETECTION
    # ========================================================

    try:

        events = detect_event(
            text
        )

    except Exception as error:

        print(
            "[NLP EVENT ERROR] "
            f"{symbol}: {error}"
        )

        events = []

    # ========================================================
    # 8. FINANCIAL IMPACT
    # ========================================================

    try:

        impact = assess_impact(

            sentiment=sentiment,

            relevance=relevance,

            risk_terms=risk_terms,

            events=events,

            risk_context=risk_context
        )

    except Exception as error:

        print(
            "[NLP IMPACT ERROR] "
            f"{symbol}: {error}"
        )

        impact = {

            "level": "low",

            "direction": "unknown",

            "reason": (
                "Impact assessment failed."
            )
        }

    # ========================================================
    # 9. HUMAN-READABLE FINANCIAL INSIGHT
    # ========================================================

    try:

        insight = generate_insight(

            company_name=company_name,

            sentiment=sentiment,

            relevance=relevance,

            topics=topics,

            events=events,

            risk_terms=risk_terms,

            impact=impact,

            risk_context=risk_context
        )

    except Exception as error:

        print(
            "[NLP INSIGHT ERROR] "
            f"{symbol}: {error}"
        )

        insight = (
            "Financial insight could not be generated "
            "for this article."
        )

    # ========================================================
    # FINAL STRUCTURED ARTICLE
    # ========================================================

    analyzed_article.update({

        # ----------------------------------------------------
        # Sentiment
        # ----------------------------------------------------

        "sentiment": sentiment,

        "sentiment_score": round(
            sentiment_score,
            6
        ),

        # ----------------------------------------------------
        # NER
        # ----------------------------------------------------

        "entities": entities,

        # ----------------------------------------------------
        # Risk intelligence
        # ----------------------------------------------------

        "risk_terms": risk_terms,

        "risk_context": risk_context,

        # ----------------------------------------------------
        # Topic intelligence
        # ----------------------------------------------------

        "topics": topics,

        # ----------------------------------------------------
        # Event intelligence
        # ----------------------------------------------------

        "events": events,

        # ----------------------------------------------------
        # Relevance
        # ----------------------------------------------------

        "relevance": relevance,

        "entity_relevance": entity_match,

        # ----------------------------------------------------
        # Financial impact
        # ----------------------------------------------------

        "impact": impact,

        # ----------------------------------------------------
        # Human-readable explanation
        # ----------------------------------------------------

        "insight": insight
    })

    return analyzed_article
