COMPANY_NAMES = {
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy Services",
    "INFY.NS": "Infosys",
    "HDFCBANK.NS": "HDFC Bank",
    "ICICIBANK.NS": "ICICI Bank",
    "SBIN.NS": "State Bank of India",
    "ITC.NS": "ITC",
    "LT.NS": "Larsen & Toubro",
    "BHARTIARTL.NS": "Bharti Airtel"
}


def get_company_name(symbol: str):

    symbol = symbol.upper()

    return COMPANY_NAMES.get(
        symbol,
        symbol.replace(".NS", "")
    )