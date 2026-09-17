import re


# =========================================================
# FINANCIAL RISK / BUSINESS SIGNAL VOCABULARY
# =========================================================

RISK_TERMS = {

    "high": [
        "fraud",
        "default",
        "bankruptcy",
        "insolvency",
        "investigation",
        "lawsuit",
        "scandal",
        "downgrade",
        "regulatory action",
        "regulatory penalty",
        "penalty",
        "fine",
        "accounting irregularity",
        "accounting fraud",
        "financial misconduct",
        "credit downgrade",
        "restatement",
        "probe",
        "legal action"
    ],

    "medium": [
        "decline",
        "loss",
        "weak demand",
        "slowdown",
        "debt",
        "uncertainty",
        "warning",
        "volatility",
        "pressure",
        "risk",
        "challenge",
        "margin pressure",
        "cost increase",
        "rising costs",
        "weak outlook",
        "guidance cut",
        "revenue decline",
        "profit decline",
        "lower earnings"
    ],

    "positive": [
        "growth",
        "profit",
        "strong earnings",
        "revenue growth",
        "expansion",
        "upgrade",
        "record revenue",
        "record profit",
        "strong demand",
        "margin expansion",
        "guidance raised",
        "earnings growth",
        "revenue increased",
        "profit increased",
        "investment",
        "partnership"
    ]
}


# =========================================================
# RISK CONTEXT
# =========================================================

RISK_CONTEXT = {

    "geopolitical": [
        "geopolitical",
        "geopolitical tensions",
        "sanctions",
        "war",
        "armed conflict",
        "military conflict",
        "iran tensions",
        "middle east tensions",
        "strait of hormuz",
        "trade tensions"
    ],

    "supply_chain": [
        "supply chain disruption",
        "supply chain disruptions",
        "shipping disruption",
        "shipping disruptions",
        "logistics disruption",
        "logistics disruptions",
        "supply constraints",
        "supply shortage",
        "shortage",
        "shipping delays"
    ],

    "commodity": [
        "crude oil",
        "crude oil prices",
        "oil prices",
        "oil price",
        "natural gas",
        "natural gas prices",
        "fuel prices",
        "commodity prices",
        "commodity price",
        "commodities"
    ],

    "macroeconomic": [
        "inflation",
        "interest rates",
        "rate hike",
        "rate hikes",
        "recession",
        "economic slowdown",
        "currency depreciation",
        "weak currency",
        "economic uncertainty"
    ]
}


# =========================================================
# TOPIC KEYWORDS
# =========================================================

TOPIC_KEYWORDS = {

    "earnings": [
        "earnings",
        "profit",
        "revenue",
        "quarterly results",
        "quarterly earnings",
        "financial results",
        "net income",
        "operating profit"
    ],

    "market": [
        "stock",
        "shares",
        "market",
        "investor",
        "investors",
        "valuation",
        "share price"
    ],

    "merger_acquisition": [
        "merger",
        "acquisition",
        "acquire",
        "acquired",
        "takeover"
    ],

    "regulation": [
        "regulator",
        "regulatory",
        "sebi",
        "penalty",
        "investigation",
        "compliance"
    ],

    "expansion": [
        "expansion",
        "launch",
        "launches",
        "new market",
        "global expansion",
        "international expansion",
        "enters",
        "expands"
    ],

    "debt_financing": [
        "debt",
        "loan",
        "financing",
        "borrowing",
        "fundraising",
        "funding",
        "credit"
    ],

    "partnership": [
        "partnership",
        "partnered",
        "strategic partnership",
        "collaboration",
        "joint venture"
    ],

    "legal": [
        "lawsuit",
        "litigation",
        "court case",
        "legal action",
        "legal dispute"
    ],

    "geopolitical": [
        "geopolitical",
        "sanctions",
        "war",
        "conflict",
        "iran",
        "russia",
        "ukraine",
        "middle east",
        "strait of hormuz"
    ],

    "commodities": [
        "crude oil",
        "oil prices",
        "natural gas",
        "commodity",
        "commodities",
        "gold",
        "fuel prices"
    ]
}


# =========================================================
# SAFE TERM MATCHING
# =========================================================

def contains_term(
    text: str,
    term: str
) -> bool:

    if not isinstance(text, str):
        return False

    text = text.lower()
    term = term.lower()

    pattern = (
        r"(?<!\w)"
        + re.escape(term)
        + r"(?!\w)"
    )

    return bool(
        re.search(pattern, text)
    )


# =========================================================
# RISK TERM DETECTION
# =========================================================

def detect_risk_terms(text: str):

    detected = {
        "high_risk": [],
        "medium_risk": [],
        "positive": []
    }

    for term in RISK_TERMS["high"]:

        if contains_term(text, term):
            detected["high_risk"].append(term)

    for term in RISK_TERMS["medium"]:

        if contains_term(text, term):
            detected["medium_risk"].append(term)

    for term in RISK_TERMS["positive"]:

        if contains_term(text, term):
            detected["positive"].append(term)

    return detected


# =========================================================
# RISK CONTEXT DETECTION
# =========================================================

def detect_risk_context(text: str):

    detected = {}

    for context, keywords in RISK_CONTEXT.items():

        matched = []

        for keyword in keywords:

            if contains_term(
                text,
                keyword
            ):

                matched.append(keyword)

        if matched:

            detected[context] = list(
                dict.fromkeys(matched)
            )

    return detected


# =========================================================
# TOPIC DETECTION
# =========================================================

def detect_topic(text: str):

    topics = []

    for topic, keywords in TOPIC_KEYWORDS.items():

        if any(
            contains_term(text, keyword)
            for keyword in keywords
        ):

            topics.append(topic)

    return topics


# =========================================================
# BACKWARD-COMPATIBLE COMPANY RELEVANCE
# =========================================================

def calculate_relevance(
    text: str,
    company_name: str,
    symbol: str
):

    text_lower = text.lower()

    company_name = company_name.lower()

    symbol_clean = symbol.lower()

    company_match = (
        company_name in text_lower
    )

    symbol_match = (
        symbol_clean in text_lower
    )

    company_words = company_name.split()

    individual_word_match = any(
        len(word) > 3
        and word in text_lower
        for word in company_words
    )

    if company_match or symbol_match:

        return {
            "level": "high",
            "score": 1.0,
            "reason": (
                "Company name or symbol "
                "was found in the article."
            )
        }

    if individual_word_match:

        return {
            "level": "medium",
            "score": 0.6,
            "reason": (
                "A component of the company "
                "name was found in the article."
            )
        }

    return {
        "level": "low",
        "score": 0.0,
        "reason": (
            "Company was not directly "
            "detected in the article."
        )
    }


# =========================================================
# BACKWARD-COMPATIBLE ENTITY RELEVANCE
# =========================================================

def entity_relevance(
    entities: list,
    company_name: str
):

    company_words = [
        word.lower()
        for word in company_name.split()
        if len(word) > 3
    ]

    matched_entities = []

    for entity in entities:

        entity_text = entity.get(
            "text",
            ""
        ).lower()

        if any(
            word in entity_text
            for word in company_words
        ):

            matched_entities.append(
                entity.get("text", "")
            )

    if matched_entities:

        return {
            "level": "high",
            "matched_entities": list(
                dict.fromkeys(
                    matched_entities
                )
            ),
            "reason": (
                "The target company was "
                "detected as a named entity."
            )
        }

    return {
        "level": "low",
        "matched_entities": [],
        "reason": (
            "The target company was not "
            "detected as a named entity."
        )
    }