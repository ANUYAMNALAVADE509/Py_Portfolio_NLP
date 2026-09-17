def assess_impact(
    sentiment: str,
    relevance: dict,
    risk_terms: dict,
    events: list,
    risk_context: dict | None = None
):

    if risk_context is None:
        risk_context = {}

    category = relevance.get(
        "category",
        "irrelevant"
    )

    # ==================================================
    # 1. Irrelevant article
    # ==================================================

    if category == "irrelevant":

        return {
            "level": "low",
            "direction": "unknown",
            "reason": (
                "The article is not sufficiently "
                "relevant to the selected company."
            )
        }

    # ==================================================
    # 2. Signals
    # ==================================================

    high_risk = risk_terms.get(
        "high_risk",
        []
    )

    medium_risk = risk_terms.get(
        "medium_risk",
        []
    )

    positive_signals = risk_terms.get(
        "positive",
        []
    )

    event_names = [
        event.get("event")
        for event in events
    ]

    # ==================================================
    # 3. High-risk financial signals
    # ==================================================

    if high_risk:

        return {
            "level": "high",
            "direction": "potentially_negative",
            "reason": (
                "High-risk financial or "
                "regulatory signals were detected."
            )
        }

    if "regulatory_action" in event_names:

        return {
            "level": "high",
            "direction": "potentially_negative",
            "reason": (
                "A regulatory action was detected."
            )
        }

    if "legal_action" in event_names:

        return {
            "level": "high",
            "direction": "potentially_negative",
            "reason": (
                "A legal action was detected."
            )
        }

    # ==================================================
    # 4. Medium financial risk
    # ==================================================

    if medium_risk:

        return {
            "level": "medium",
            "direction": "potentially_negative",
            "reason": (
                "Potential financial risk signals "
                "were detected."
            )
        }

    # ==================================================
    # 5. Risk context
    # ==================================================

    if risk_context:

        contexts = list(
            risk_context.keys()
        )

        context_text = ", ".join(
            contexts
        )

        # Direct or related company articles
        # receive stronger contextual impact.

        if category in {
            "direct_company",
            "related_business"
        }:

            return {
                "level": "medium",
                "direction": "potentially_negative",
                "reason": (
                    "The article contains "
                    f"{context_text} risk context "
                    "that may affect the company "
                    "or its related business."
                )
            }

        # Sector-only article

        return {
            "level": "low",
            "direction": "potentially_negative",
            "reason": (
                "Sector-level "
                f"{context_text} risk signals "
                "were detected, but the "
                "company-specific impact is "
                "not established."
            )
        }

    # ==================================================
    # 6. Positive business events
    # ==================================================

    positive_events = {
        "revenue_growth",
        "profit_growth",
        "international_expansion",
        "partnership",
        "product_or_service_launch",
        "investment"
    }

    if any(
        event in positive_events
        for event in event_names
    ):

        return {
            "level": "medium",
            "direction": "potentially_positive",
            "reason": (
                "A potentially positive business "
                "event was detected."
            )
        }

    # ==================================================
    # 7. Positive sentiment
    # ==================================================

    if sentiment == "positive" or positive_signals:

        return {
            "level": "low",
            "direction": "potentially_positive",
            "reason": (
                "The relevant article contains "
                "positive financial signals."
            )
        }

    # ==================================================
    # 8. Negative sentiment
    # ==================================================

    if sentiment == "negative":

        return {
            "level": "low",
            "direction": "potentially_negative",
            "reason": (
                "The relevant article contains "
                "negative financial sentiment."
            )
        }

    # ==================================================
    # 9. Neutral
    # ==================================================

    return {
        "level": "low",
        "direction": "neutral",
        "reason": (
            "No strong financial impact signal "
            "was detected."
        )
    }