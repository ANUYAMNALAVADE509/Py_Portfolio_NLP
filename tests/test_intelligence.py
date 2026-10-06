from backend.nlp.intelligence import (
    contains_term,
    detect_risk_terms,
    detect_risk_context,
    detect_topic,
    calculate_relevance,
    entity_relevance,
)


# =========================================================
# TEST: contains_term()
# =========================================================

def test_contains_term_finds_exact_term():
    text = "The company reported strong earnings growth."

    assert contains_term(text, "earnings") is True


def test_contains_term_is_case_insensitive():
    text = "The Company Reported Strong Earnings."

    assert contains_term(text, "earnings") is True


def test_contains_term_does_not_match_partial_word():
    text = "The company reported earnings."

    assert contains_term(text, "earn") is False


def test_contains_term_handles_punctuation():
    text = "The company faces a lawsuit."

    assert contains_term(text, "lawsuit") is True


def test_contains_term_returns_false_for_missing_term():
    text = "The company reported strong growth."

    assert contains_term(text, "bankruptcy") is False


def test_contains_term_returns_false_for_non_string_text():
    assert contains_term(None, "growth") is False


# =========================================================
# TEST: detect_risk_terms()
# =========================================================

def test_detect_risk_terms_detects_high_risk():
    text = "The company is facing fraud and bankruptcy."

    result = detect_risk_terms(text)

    assert "fraud" in result["high_risk"]
    assert "bankruptcy" in result["high_risk"]


def test_detect_risk_terms_detects_medium_risk():
    text = "The company reported weak demand and rising costs."

    result = detect_risk_terms(text)

    assert "weak demand" in result["medium_risk"]
    assert "rising costs" in result["medium_risk"]


def test_detect_risk_terms_detects_positive_signals():
    text = "The company reported revenue growth and strong demand."

    result = detect_risk_terms(text)

    assert "revenue growth" in result["positive"]
    assert "strong demand" in result["positive"]


def test_detect_risk_terms_returns_expected_structure():
    result = detect_risk_terms("The company reported growth.")

    assert "high_risk" in result
    assert "medium_risk" in result
    assert "positive" in result

    assert isinstance(result["high_risk"], list)
    assert isinstance(result["medium_risk"], list)
    assert isinstance(result["positive"], list)


def test_detect_risk_terms_empty_text():
    result = detect_risk_terms("")

    assert result == {
        "high_risk": [],
        "medium_risk": [],
        "positive": []
    }


# =========================================================
# TEST: detect_risk_context()
# =========================================================

def test_detect_risk_context_geopolitical():
    text = "Geopolitical tensions and sanctions affected the market."

    result = detect_risk_context(text)

    assert "geopolitical" in result
    assert "geopolitical tensions" in result["geopolitical"]
    assert "sanctions" in result["geopolitical"]


def test_detect_risk_context_supply_chain():
    text = "The company experienced supply chain disruptions."

    result = detect_risk_context(text)

    assert "supply_chain" in result
    assert "supply chain disruptions" in result["supply_chain"]


def test_detect_risk_context_commodity():
    text = "Crude oil prices increased significantly."

    result = detect_risk_context(text)

    assert "commodity" in result
    assert "crude oil prices" in result["commodity"]


def test_detect_risk_context_macroeconomic():
    text = "Inflation and interest rates remain uncertain."

    result = detect_risk_context(text)

    assert "macroeconomic" in result
    assert "inflation" in result["macroeconomic"]
    assert "interest rates" in result["macroeconomic"]


def test_detect_risk_context_no_match():
    text = "The company launched a new product."

    result = detect_risk_context(text)

    assert result == {}


# =========================================================
# TEST: detect_topic()
# =========================================================

def test_detect_topic_earnings():
    text = "The company announced strong quarterly earnings."

    result = detect_topic(text)

    assert "earnings" in result


def test_detect_topic_market():
    text = "Investors reacted to the stock price movement."

    result = detect_topic(text)

    assert "market" in result


def test_detect_topic_merger_acquisition():
    text = "The company announced an acquisition."

    result = detect_topic(text)

    assert "merger_acquisition" in result


def test_detect_topic_regulation():
    text = "The regulator launched an investigation."

    result = detect_topic(text)

    assert "regulation" in result


def test_detect_topic_expansion():
    text = "The company announced international expansion."

    result = detect_topic(text)

    assert "expansion" in result


def test_detect_topic_debt_financing():
    text = "The company secured new financing."

    result = detect_topic(text)

    assert "debt_financing" in result


def test_detect_topic_partnership():
    text = "The company announced a strategic partnership."

    result = detect_topic(text)

    assert "partnership" in result


def test_detect_topic_legal():
    text = "The company is facing a lawsuit."

    result = detect_topic(text)

    assert "legal" in result


def test_detect_topic_geopolitical():
    text = "Geopolitical tensions affected the company."

    result = detect_topic(text)

    assert "geopolitical" in result


def test_detect_topic_commodities():
    text = "Crude oil prices increased."

    result = detect_topic(text)

    assert "commodities" in result


def test_detect_topic_no_match():
    text = "The company announced a new office."

    result = detect_topic(text)

    assert result == []


# =========================================================
# TEST: calculate_relevance()
# =========================================================

def test_calculate_relevance_company_name_match():
    result = calculate_relevance(
        "Reliance Industries reported strong earnings.",
        "Reliance Industries",
        "RELIANCE.NS"
    )

    assert result["level"] == "high"
    assert result["score"] == 1.0


def test_calculate_relevance_symbol_match():
    result = calculate_relevance(
        "RELIANCE.NS gained after strong earnings.",
        "Reliance Industries",
        "RELIANCE.NS"
    )

    assert result["level"] == "high"
    assert result["score"] == 1.0


def test_calculate_relevance_individual_company_word():
    result = calculate_relevance(
        "Reliance reported strong revenue growth.",
        "Reliance Industries",
        "RELIANCE.NS"
    )

    assert result["level"] == "medium"
    assert result["score"] == 0.6


def test_calculate_relevance_no_match():
    result = calculate_relevance(
        "Tata Consultancy Services reported strong earnings.",
        "Reliance Industries",
        "RELIANCE.NS"
    )

    assert result["level"] == "low"
    assert result["score"] == 0.0


def test_calculate_relevance_returns_expected_structure():
    result = calculate_relevance(
        "Reliance Industries reported growth.",
        "Reliance Industries",
        "RELIANCE.NS"
    )

    assert "level" in result
    assert "score" in result
    assert "reason" in result


# =========================================================
# TEST: entity_relevance()
# =========================================================

def test_entity_relevance_detects_company():
    entities = [
        {
            "text": "Reliance Industries",
            "label": "ORG"
        }
    ]

    result = entity_relevance(
        entities,
        "Reliance Industries"
    )

    assert result["level"] == "high"
    assert "Reliance Industries" in result["matched_entities"]


def test_entity_relevance_detects_matching_company_word():
    entities = [
        {
            "text": "Reliance",
            "label": "ORG"
        }
    ]

    result = entity_relevance(
        entities,
        "Reliance Industries"
    )

    assert result["level"] == "high"
    assert "Reliance" in result["matched_entities"]


def test_entity_relevance_no_company_match():
    entities = [
        {
            "text": "Tata Consultancy Services",
            "label": "ORG"
        }
    ]

    result = entity_relevance(
        entities,
        "Reliance Industries"
    )

    assert result["level"] == "low"
    assert result["matched_entities"] == []


def test_entity_relevance_returns_expected_structure():
    entities = [
        {
            "text": "Reliance Industries",
            "label": "ORG"
        }
    ]

    result = entity_relevance(
        entities,
        "Reliance Industries"
    )

    assert "level" in result
    assert "matched_entities" in result
    assert "reason" in result


def test_entity_relevance_empty_entities():
    result = entity_relevance(
        [],
        "Reliance Industries"
    )

    assert result["level"] == "low"
    assert result["matched_entities"] == []