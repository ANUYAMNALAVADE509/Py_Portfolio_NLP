import re

# =========================================================
# COMPANY PROFILES
# =========================================================

COMPANY_PROFILES = {

    # -----------------------------------------------------
    # RELIANCE
    # -----------------------------------------------------

    "RELIANCE.NS": {
        "name": "Reliance Industries",

        "direct_aliases": [
            "Reliance Industries",
            "Reliance Industries Limited",
            "Reliance"
        ],

        "related_entities": [
            "Jio Platforms",
            "JioHotstar",
            "Reliance Retail",
            "Reliance Brands"
        ],

        "sector_keywords": [
            "telecommunications",
            "telecom",
            "retail",
            "media",
            "streaming",
            "energy",
            "oil",
            "gas",
            "petrochemical"
        ]
    },


    # -----------------------------------------------------
    # TCS
    # -----------------------------------------------------

    "TCS.NS": {
        "name": "Tata Consultancy Services",

        "direct_aliases": [
            "Tata Consultancy Services",
            "TCS"
        ],

        "related_entities": [
            "Tata Group"
        ],

        "sector_keywords": [
            "information technology",
            "IT services",
            "software",
            "technology",
            "consulting"
        ]
    },


    # -----------------------------------------------------
    # INFOSYS
    # -----------------------------------------------------

    "INFY.NS": {
        "name": "Infosys",

        "direct_aliases": [
            "Infosys",
            "Infosys Limited"
        ],

        "related_entities": [],

        "sector_keywords": [
            "information technology",
            "IT services",
            "software",
            "technology",
            "consulting"
        ]
    },


    # -----------------------------------------------------
    # HDFC BANK
    # -----------------------------------------------------

    "HDFCBANK.NS": {
        "name": "HDFC Bank",

        "direct_aliases": [
            "HDFC Bank",
            "HDFC Bank Limited"
        ],

        "related_entities": [
            "HDFC"
        ],

        "sector_keywords": [
            "bank",
            "banking",
            "financial services",
            "lending",
            "loan",
            "credit"
        ]
    },


    # -----------------------------------------------------
    # ICICI BANK
    # -----------------------------------------------------

    "ICICIBANK.NS": {
        "name": "ICICI Bank",

        "direct_aliases": [
            "ICICI Bank",
            "ICICI Bank Limited"
        ],

        "related_entities": [
            "ICICI"
        ],

        "sector_keywords": [
            "bank",
            "banking",
            "financial services",
            "lending",
            "loan",
            "credit"
        ]
    },


    # -----------------------------------------------------
    # SBI
    # -----------------------------------------------------

    "SBIN.NS": {
        "name": "State Bank of India",

        "direct_aliases": [
            "State Bank of India",
            "SBI"
        ],

        "related_entities": [],

        "sector_keywords": [
            "bank",
            "banking",
            "financial services",
            "lending",
            "loan",
            "credit"
        ]
    },


    # -----------------------------------------------------
    # ITC
    # -----------------------------------------------------

    "ITC.NS": {
        "name": "ITC",

        "direct_aliases": [
            "ITC Limited",
            "ITC Ltd"
        ],

        "related_entities": [],

        "sector_keywords": [
            "consumer goods",
            "FMCG",
            "tobacco",
            "hotels",
            "paper",
            "packaging"
        ]
    },


    # -----------------------------------------------------
    # LARSEN & TOUBRO
    # -----------------------------------------------------

    "LT.NS": {
        "name": "Larsen & Toubro",

        "direct_aliases": [
            "Larsen & Toubro",
            "Larsen and Toubro",
            "L&T"
        ],

        "related_entities": [],

        "sector_keywords": [
            "engineering",
            "construction",
            "infrastructure",
            "defence",
            "technology"
        ]
    },


    # -----------------------------------------------------
    # BHARTI AIRTEL
    # -----------------------------------------------------

    "BHARTIARTL.NS": {
        "name": "Bharti Airtel",

        "direct_aliases": [
            "Bharti Airtel",
            "Airtel"
        ],

        "related_entities": [],

        "sector_keywords": [
            "telecommunications",
            "telecom",
            "mobile network",
            "5G"
        ]
    }
}


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(text: str) -> str:

    if not isinstance(text, str):
        return ""

    text = text.lower()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# =========================================================
# URL NORMALIZATION
# =========================================================

def normalize_url_for_matching(url: str) -> str:

    if not isinstance(url, str):
        return ""

    url = url.lower()

    # Convert URL separators into spaces.
    #
    # Example:
    #
    # reliance-brands-limited
    #
    # becomes:
    #
    # reliance brands limited

    url = re.sub(
        r"[-_/]+",
        " ",
        url
    )

    url = re.sub(
        r"\s+",
        " ",
        url
    )

    return url.strip()


# =========================================================
# SAFE PHRASE MATCHING
# =========================================================

def contains_phrase(
    text: str,
    phrase: str
) -> bool:

    text = normalize_text(text)
    phrase = normalize_text(phrase)

    if not text or not phrase:
        return False

    pattern = (
        r"(?<!\w)"
        + re.escape(phrase)
        + r"(?!\w)"
    )

    return bool(
        re.search(pattern, text)
    )


# =========================================================
# URL PHRASE MATCHING
# =========================================================

def contains_url_phrase(
    url: str,
    phrase: str
) -> bool:

    url_text = normalize_url_for_matching(url)
    phrase = normalize_text(phrase)

    if not url_text or not phrase:
        return False

    pattern = (
        r"(?<!\w)"
        + re.escape(phrase)
        + r"(?!\w)"
    )

    return bool(
        re.search(pattern, url_text)
    )


# =========================================================
# COMPANY PROFILE
# =========================================================

def get_company_profile(symbol: str):

    symbol = (
        symbol
        .upper()
        .strip()
    )

    return COMPANY_PROFILES.get(
        symbol,
        {
            "name": symbol.replace(
                ".NS",
                ""
            ),
            "direct_aliases": [],
            "related_entities": [],
            "sector_keywords": []
        }
    )


# =========================================================
# RELEVANCE CLASSIFICATION
# =========================================================

def classify_relevance(
    text: str,
    symbol: str,
    entities: list | None = None,
    url: str = ""
):

    profile = get_company_profile(symbol)

    article_text = normalize_text(text)

    # =====================================================
    # 1. DIRECT COMPANY MATCH
    #
    # IMPORTANT:
    # Direct company matching uses ARTICLE TEXT ONLY.
    #
    # URL cannot create direct_company.
    # =====================================================

    direct_matches = []

    for alias in profile["direct_aliases"]:

        if contains_phrase(
            article_text,
            alias
        ):

            direct_matches.append(alias)

    if direct_matches:

        return {
            "category": "direct_company",
            "level": "high",
            "score": 1.0,
            "matched_terms": list(
                dict.fromkeys(
                    direct_matches
                )
            ),
            "evidence_source": "article_text",
            "reason": (
                "The article text directly "
                f"mentions {profile['name']}."
            )
        }

    # =====================================================
    # 2. RELATED BUSINESS MATCH IN ARTICLE TEXT
    # =====================================================

    related_matches = []

    for alias in profile["related_entities"]:

        if contains_phrase(
            article_text,
            alias
        ):

            related_matches.append(alias)

    if related_matches:

        return {
            "category": "related_business",
            "level": "high",
            "score": 0.85,
            "matched_terms": list(
                dict.fromkeys(
                    related_matches
                )
            ),
            "evidence_source": "article_text",
            "reason": (
                "The article text mentions a "
                "business entity associated with "
                f"{profile['name']}."
            )
        }

    # =====================================================
    # 3. RELATED ENTITY DETECTED BY NER
    # =====================================================

    ner_related_matches = []

    if entities:

        for entity in entities:

            entity_text = entity.get(
                "text",
                ""
            )

            for alias in profile[
                "related_entities"
            ]:

                if contains_phrase(
                    entity_text,
                    alias
                ):

                    ner_related_matches.append(
                        entity_text
                    )

    if ner_related_matches:

        return {
            "category": "related_business",
            "level": "high",
            "score": 0.85,
            "matched_terms": list(
                dict.fromkeys(
                    ner_related_matches
                )
            ),
            "evidence_source": "named_entity",
            "reason": (
                "A related business entity was "
                "identified in the article."
            )
        }

    # =====================================================
    # 4. RELATED BUSINESS ONLY IN URL
    #
    # This is supporting metadata.
    #
    # It does NOT become direct_company.
    # =====================================================

    url_related_matches = []

    for alias in profile["related_entities"]:

        if contains_url_phrase(
            url,
            alias
        ):

            url_related_matches.append(alias)

    if url_related_matches:

        return {
            "category": "related_business",
            "level": "medium",
            "score": 0.65,
            "matched_terms": list(
                dict.fromkeys(
                    url_related_matches
                )
            ),
            "evidence_source": "url_metadata",
            "reason": (
                "The article URL references a "
                "related business entity, but the "
                "article text does not explicitly "
                "mention that entity."
            )
        }

    # =====================================================
    # 5. SECTOR / MARKET CONTEXT
    # =====================================================

    sector_matches = []

    for keyword in profile[
        "sector_keywords"
    ]:

        if contains_phrase(
            article_text,
            keyword
        ):

            sector_matches.append(keyword)

    if sector_matches:

        return {
            "category": "sector_market",
            "level": "low",
            "score": 0.35,
            "matched_terms": list(
                dict.fromkeys(
                    sector_matches
                )
            ),
            "evidence_source": "article_text",
            "reason": (
                "The article contains sector or "
                "market information relevant to "
                f"{profile['name']}'s business context, "
                "but does not directly mention the company."
            )
        }

    # =====================================================
    # 6. IRRELEVANT
    # =====================================================

    return {
        "category": "irrelevant",
        "level": "low",
        "score": 0.0,
        "matched_terms": [],
        "evidence_source": "none",
        "reason": (
            "The article does not contain a direct "
            "company, related business, or relevant "
            "sector signal."
        )
    }