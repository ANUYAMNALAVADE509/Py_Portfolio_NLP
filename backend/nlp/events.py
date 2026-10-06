import re

# =========================================================
# SAFE KEYWORD MATCHING
# =========================================================

def contains_keyword(
    text: str,
    keyword: str
) -> bool:

    text = text.lower()
    keyword = keyword.lower()

    pattern = (
        r"(?<!\w)"
        + re.escape(keyword)
        + r"(?!\w)"
    )

    return bool(
        re.search(pattern, text)
    )


# =========================================================
# FINANCIAL EVENT DETECTION
# =========================================================

def detect_event(text: str):

    if not isinstance(text, str):
        return []

    text_lower = text.lower()

    event_rules = {

        # -------------------------------------------------
        # Earnings
        # -------------------------------------------------

        "earnings_announcement": [
            "quarterly results",
            "quarterly earnings",
            "reported earnings",
            "reported profit",
            "reported revenue",
            "financial results",
            "earnings report"
        ],

        # -------------------------------------------------
        # Revenue
        # -------------------------------------------------

        "revenue_growth": [
            "revenue growth",
            "revenue increased",
            "revenue rose",
            "revenue surged",
            "higher revenue",
            "revenue grew"
        ],

        "revenue_decline": [
            "revenue declined",
            "revenue fell",
            "revenue dropped",
            "lower revenue",
            "revenue decreased"
        ],

        # -------------------------------------------------
        # Profit
        # -------------------------------------------------

        "profit_growth": [
            "profit growth",
            "profit increased",
            "profit rose",
            "profit surged",
            "higher profit",
            "profit grew"
        ],

        "profit_decline": [
            "profit declined",
            "profit fell",
            "profit dropped",
            "lower profit",
            "profit decreased"
        ],

        # -------------------------------------------------
        # Loss
        # -------------------------------------------------

        "loss": [
            "reported a loss",
            "net loss",
            "quarterly loss",
            "operating loss"
        ],

        # -------------------------------------------------
        # Acquisition
        # -------------------------------------------------

        "acquisition": [
            "acquisition",
            "acquire",
            "acquired",
            "takeover"
        ],

        # -------------------------------------------------
        # Partnership
        # -------------------------------------------------

        "partnership": [
            "partnership",
            "partnered",
            "strategic partnership",
            "collaboration",
            "joint venture",
            "signed an agreement"
        ],

        # -------------------------------------------------
        # Expansion
        # -------------------------------------------------

        "international_expansion": [
            "global expansion",
            "international expansion",
            "expands globally",
            "expands into",
            "enters the",
            "enters a new market",
            "launches in",
            "launch in"
        ],

        # -------------------------------------------------
        # Product / service launch
        # -------------------------------------------------

        "product_or_service_launch": [
            "new product",
            "new service",
            "product launch",
            "service launch",
            "launched",
            "launches"
        ],

        # -------------------------------------------------
        # Regulation
        # -------------------------------------------------

        "regulatory_action": [
            "regulatory action",
            "regulatory penalty",
            "regulatory probe",
            "regulator investigation",
            "regulatory investigation",
            "regulatory fine",
            "penalty",
            "fine"
        ],

        # -------------------------------------------------
        # Legal
        # -------------------------------------------------

        "legal_action": [
            "lawsuit",
            "legal action",
            "court case",
            "litigation",
            "legal dispute"
        ],

        # -------------------------------------------------
        # Debt / financing
        # -------------------------------------------------

        "debt_or_financing": [
            "debt financing",
            "raises debt",
            "loan",
            "borrowing",
            "fundraising",
            "funding round",
            "financing"
        ],

        # -------------------------------------------------
        # IPO
        # -------------------------------------------------

        "ipo": [
            "ipo",
            "initial public offering",
            "public offering"
        ],

        # -------------------------------------------------
        # Investment / ownership
        # -------------------------------------------------

        "investment": [
            "investment",
            "invests",
            "invested",
            "stake acquisition",
            "takes a stake",
            "acquires a stake",
            "stakes in",
            "stake in",
            "holds a stake",
            "ownership stake",
            "strategic stake",
            "equity stake"
        ]
    }

    detected_events = []

    # =====================================================
    # CHECK EVERY EVENT
    # =====================================================

    for event, keywords in event_rules.items():

        matched_keywords = []

        for keyword in keywords:

            if contains_keyword(
                text_lower,
                keyword
            ):

                matched_keywords.append(
                    keyword
                )

        if matched_keywords:

            detected_events.append({
                "event": event,
                "matched_keywords": (
                    matched_keywords
                )
            })

    return detected_events
