def generate_insight(
    company_name: str,
    sentiment: str,
    relevance: dict,
    topics: list,
    events: list,
    risk_terms: dict,
    impact: dict,
    risk_context: dict | None = None
):
    if risk_context is None:
        risk_context = {}

    category = relevance.get(
        "category",
        "irrelevant"
    )

    matched_terms = relevance.get(
        "matched_terms",
        []
    )

    impact_level = impact.get(
        "level",
        "low"
    )

    impact_direction = impact.get(
        "direction",
        "neutral"
    )

    event_names = [
        event.get("event")
        for event in events
    ]

    context_names = list(
        risk_context.keys()
    )

    # --------------------------------------------------
    # IRRELEVANT
    # --------------------------------------------------

    if category == "irrelevant":
        return (
            f"The article does not appear to be directly "
            f"relevant to {company_name}."
        )

    # --------------------------------------------------
    # DIRECT COMPANY
    # --------------------------------------------------

    if category == "direct_company":

        if impact_direction == "potentially_negative":

            if sentiment == "positive":
                return (
                    f"The article directly concerns {company_name} "
                    f"and contains a potential financial risk signal, "
                    f"despite positive overall sentiment."
                )

            if impact_level == "high":
                return (
                    f"The article directly concerns {company_name} "
                    f"and contains potentially significant negative "
                    f"financial or business signals."
                )

            return (
                f"The article directly concerns {company_name} "
                f"and contains potential negative financial or "
                f"business signals."
            )

        if impact_direction == "potentially_positive":

            if "revenue_growth" in event_names:
                return (
                    f"The article reports revenue growth associated "
                    f"with {company_name}, which may represent a "
                    f"positive business signal."
                )

            if "profit_growth" in event_names:
                return (
                    f"The article reports positive profit-related "
                    f"developments associated with {company_name}."
                )

            if "international_expansion" in event_names:
                return (
                    f"The article indicates international expansion "
                    f"activity associated with {company_name}."
                )

            if "acquisition" in event_names:
                return (
                    f"The article discusses an acquisition associated "
                    f"with {company_name}."
                )

            if "partnership" in event_names:
                return (
                    f"The article discusses a partnership or "
                    f"collaboration associated with {company_name}."
                )

            if "investment" in event_names:
                return (
                    f"The article discusses an investment or ownership "
                    f"development associated with {company_name}."
                )

            if "ipo" in event_names:
                return (
                    f"The article discusses an IPO-related development "
                    f"associated with {company_name}."
                )

            return (
                f"The article directly concerns {company_name} "
                f"and contains a potentially positive business signal."
            )

        # Neutral / unknown impact

        if sentiment == "positive":
            return (
                f"The article has positive financial sentiment and "
                f"directly concerns {company_name}, but no strong "
                f"business impact signal was detected."
            )

        if sentiment == "negative":
            return (
                f"The article has negative financial sentiment and "
                f"directly concerns {company_name}, but no strong "
                f"business impact signal was detected."
            )

        return (
            f"The article directly concerns {company_name}, but "
            f"no strong positive or negative business impact signal "
            f"was detected."
        )

    # --------------------------------------------------
    # RELATED BUSINESS
    # --------------------------------------------------

    if category == "related_business":

        related_name = (
            matched_terms[0]
            if matched_terms
            else "a related business"
        )

        if relevance.get(
            "evidence_source"
        ) == "url_metadata":

            return (
                f"The article URL references {related_name}, "
                f"a business entity associated with {company_name}. "
                f"The article text does not explicitly mention this "
                f"entity, so the relevance is based on supporting "
                f"URL metadata."
            )

        if impact_direction == "potentially_negative":

            return (
                f"The article discusses {related_name}, a business "
                f"entity associated with {company_name}, and contains "
                f"potential negative business or financial signals."
            )

        if impact_direction == "potentially_positive":

            return (
                f"The article discusses {related_name}, a business "
                f"entity associated with {company_name}, and contains "
                f"a potentially positive business signal."
            )

        return (
            f"The article discusses {related_name}, a business "
            f"entity associated with {company_name}. This may provide "
            f"indirect portfolio risk or opportunity context."
        )

    # --------------------------------------------------
    # SECTOR / MARKET
    # --------------------------------------------------

    if category == "sector_market":

        topic_text = (
            ", ".join(topics)
            if topics
            else "sector or market"
        )

        if context_names:

            context_text = ", ".join(
                context_names
            )

            if impact_direction == "potentially_negative":

                return (
                    f"The article provides {topic_text} context "
                    f"and {context_text} risk signals that may affect "
                    f"the broader business environment of "
                    f"{company_name}, but the company-specific "
                    f"impact is not established."
                )

            return (
                f"The article provides {topic_text} context and "
                f"{context_text} signals that may affect the broader "
                f"business environment of {company_name}, but the "
                f"company-specific impact is not established."
            )

        return (
            f"The article provides {topic_text} context that may "
            f"affect the broader business environment of "
            f"{company_name}, but it does not directly mention "
            f"the company."
        )

    # --------------------------------------------------
    # FALLBACK
    # --------------------------------------------------

    return (
        f"The article may provide useful financial context for "
        f"{company_name}, but the company-specific signal is limited."
    )
