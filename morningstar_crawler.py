"""
This file pulls data from Morningstar UK (since it is the only public facing site with ISIN numbers)
by interacting directly with the website. This is not the most elegant solution and could possibly break
if Morningstar changes how their website works.
"""

from splinter import Browser
import re, sys, string

reload(sys)
sys.setdefaultencoding('utf8') # Fixes some issue with links being incorrectly decoded

b = Browser('zope.testbrowser', ignore_robots=True)

ALLOWED_EXCHANGES = {'CAD':['TSX', 'TSE'],'USD':['NASDAQ','NYSE','ARCA', 'AMEX']}
MORNINGSTAR_BASE_URL = 'http://www.morningstar.co.uk/uk/funds/SecuritySearchResults.aspx?type=ALL&search='

_quote = {}

def find_by_ISIN(ISIN, currency):
    _quote["currency"] = currency

    try:
        b.visit(MORNINGSTAR_BASE_URL + ISIN)
    except Exception, e:
        _quote["error"] = "Error contacting security search: " + str(e)
        return _quote


    # Search for results on allowed exchanges
    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "

    # needs to start at -3 to override the last "or"
    xpath_search = xpath_search[:-3] + ")]"

    try:
        result = b.find_by_xpath(xpath_search).first
        _quote["ticker"] = result.text.split(":", 1)[1]  # Get ticker value
        link = result.find_by_xpath('.//ancestor::tr/td[1]/a').first
    except:
        _quote["error"] = "Invalid ISIN/currency pair"
        return _quote

    _get_secutity_info(link)

    return _quote

def find_by_ticker(ticker, currency):
    _quote["ticker"] = ticker
    _quote["currency"] = currency

    try:
        b.visit(MORNINGSTAR_BASE_URL + ticker)
    except Exception, e:
        _quote["error"] = "Error contacting security search: " + str(e)
        return _quote

    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "

    # needs to start at -3 to override the last "or"
    xpath_search = xpath_search[:-3] + ") and contains(.,':" + ticker + "')]"

    link = ""
    try:
        result = b.find_by_xpath(xpath_search).first
        link = result.find_by_xpath('.//ancestor::tr/td[1]/a').first
    except:
        _quote["error"] = "Invalid ticker/currency pair"
        return _quote

    _get_secutity_info(link)

    return _quote

def _get_secutity_info(link):

    _quote["security"] = filter(lambda x : x in set(string.printable), link.text) # removes any weird characters

    b.visit(link['href'])

    # ETF pages have a different layout than Stock pages
    try:
        if 'etf' in link['href']:
            price_cell = b.find_by_xpath("//tr[contains(.,'Closing Price')]/td[3]")
            _quote["last_close_price"] = float(re.sub("[^0-9.]", "", price_cell.text))
            _quote["ISIN"] = b.find_by_xpath("//tr[contains(.,'ISIN')]/td[3]").text

        else:
            price_cell = b.find_by_id("Col0LastClose")
            _quote["last_close_price"] = float(re.sub("[^0-9.]", "", price_cell.text))
            _quote["ISIN"] = b.find_by_id('Col0Isin').text

        _quote["error"] = ""
    except Exception, e:
        _quote["error"] = "Error gathering security info: " + str(e)