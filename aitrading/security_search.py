"""
This modudle provides functions to search for securities by ISIN or ticker symbol and returns relevant information
about that security. Notably, the ticker, ISIN, security name and last close price.

Currently this uses eodhd.com as the source of information, but their free tier has a low rate limit of 20 calls
per day, so caching is employed to reduce the number of calls made, if there's duplicates within the same day.
"""
import os
from memoization import cached
from eod import EodHistoricalData

CACHE_TTL = int(os.environ.get('EODHD_CACHE_TTL_SECONDS', 43200))  # Default to 12 hours if not set
CURRENCY_TO_EXCHANGE = {'CAD': 'TO', 'USD': 'US'}

API_TOKEN = os.environ.get('EODHD_API_TOKEN')
client = EodHistoricalData(API_TOKEN)

@cached(ttl=CACHE_TTL)
def find_by_isin(isin, currency):
    quote = {
        "isin": isin,
        "currency": currency
    }

    try:
        resp = client.get_search_instrument(query_string=isin, exchange=CURRENCY_TO_EXCHANGE[currency], limit=50)
        
        if len(resp) == 0:
            quote["error"] = "No results for ISIN/currency pair."
            return quote

        if len(resp) == 1:
            result = resp[0]
            if result["ISIN"] == isin and result["Currency"] == currency:
                quote["ticker"] = result["Code"]
                quote["sec_name"] = result["Name"]
                quote["price"] = result["previousClose"]
                return quote

        error = "Error: multiple results for ISIN/currency pair: "
        for result in resp:
            error += f"({result['Code']}, {result['Name']}, ${result["previousClose"]:,.2f}) "
        quote["error"] = error

    except Exception as e:
        quote["error"] = "Error contacting security search: " + str(e)
    
    return quote

@cached(ttl=CACHE_TTL)
def find_by_ticker(ticker, currency):
    # For multi-class securities, convert dot notation to dash notation
    ticker = ticker.replace('.', '-')
    quote = {
        "ticker": ticker,
        "currency": currency
    }

    try:
        resp = client.get_search_instrument(query_string=ticker, exchange=CURRENCY_TO_EXCHANGE[currency], limit=50)
        
        if len(resp) == 0:
            quote["error"] = "No results for ticker/currency pair."
            return quote

        # If there's only one exact result, return it directly
        exact_result = [result for result in resp if result["Code"] == ticker and result["Currency"] == currency]
        if len(exact_result) == 1:
            quote["isin"] = exact_result[0]["ISIN"]
            quote["sec_name"] = exact_result[0]["Name"]
            quote["price"] = exact_result[0]["previousClose"]
            return quote

        # Otherwise, it could be a multi-class security.
        multi_class_results = [result for result in resp if result["Code"].startswith(ticker+"-") and result["Currency"] == currency]
        if len(multi_class_results) == 0:
            quote["error"] = "No results for ticker/currency pair."
            return quote

        error = "Ambiguous results for ticker/currency pair, this may be a multi-class security. " \
        "Try again with one of these tickers: "
        for result in multi_class_results:
            error += f"({result['Code']}, {result['ISIN']}, {result['Name']}, ${result["previousClose"]:,.2f}) "
        quote["error"] = error

    except Exception as e:
        quote["error"] = "Error contacting security search: " + str(e)
    
    return quote
