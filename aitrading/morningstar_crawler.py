"""
This file pulls data from Morningstar UK (since it is the only public facing site with ISIN numbers)
by interacting directly with the website. This is not the most elegant solution and could possibly break
if Morningstar changes how their website works.
"""

import re, string
from lxml import html
import requests

ALLOWED_EXCHANGES = {'CAD':['TSX', 'TSE'],'USD':['NAS','NASDAQ','NYSE','ARCA', 'AMEX', 'PINX', 'BATS']}
MORNINGSTAR_BASE_URL = 'http://www.morningstar.co.uk/uk/funds/SecuritySearchResults.aspx?type=ALL&search='

_quote = {}

def find_by_isin(isin, currency):
    _quote["currency"] = currency

    try:
        page = html.fromstring(requests.get(MORNINGSTAR_BASE_URL + isin).content)
    except Exception as e:
        _quote["error"] = "Error contacting security search: " + str(e)
        return _quote

    # Search for results on allowed exchanges
    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "

    # needs to start at -3 to override the last "or"
    xpath_search = xpath_search[:-3] + ")]"

    try:
        result = page.xpath(xpath_search)[0]
        _quote["ticker"] = result.text.split(":", 1)[1]  # Get ticker value
        link = result.xpath('.//ancestor::tr/td[1]/a')[0]
    except:
        _quote["error"] = "Invalid ISIN/currency pair"
        return _quote

    _get_secutity_info(link)

    return _quote

def find_by_ticker(ticker, currency):
    _quote["ticker"] = ticker
    _quote["currency"] = currency

    try:
        page = html.fromstring(requests.get(MORNINGSTAR_BASE_URL + ticker).content)
    except Exception as e:
        _quote["error"] = "Error contacting security search: " + str(e)
        return _quote

    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "

    # needs to start at -3 to override the last "or"
    xpath_search = xpath_search[:-3] + ") and contains(.,':" + ticker + "')]"

    try:
        result = page.xpath(xpath_search)[0]
        link = result.xpath('.//ancestor::tr/td[1]/a')[0]
    except:
        _quote["error"] = "Invalid ticker/currency pair"
        return _quote

    _get_secutity_info(link)

    return _quote

def _get_secutity_info(link):

    _quote["sec_name"] = ''.join(filter(lambda x : x in string.printable, link.text)) # removes any weird characters

    # Some hrefs are relative, need to add back the domain
    if str(link.attrib['href']).startswith('/uk'):
        page = html.fromstring(requests.get('http://www.morningstar.co.uk' + link.attrib['href']).content)
    else:
        page = html.fromstring(requests.get(link.attrib['href']).content)

    # ETF pages have a different layout than Stock pages
    try:
        if 'etf' in link.attrib['href']:
            price_cell = page.xpath("//tr[contains(.,'Closing Price')]/td[3]")[0]
            _quote["price"] = float(re.sub("[^0-9.]", "", price_cell.text))
            _quote["isin"] = page.xpath("//tr[contains(.,'ISIN')]/td[3]")[0].text

        else:
            price_cell = page.xpath("//*[@id = 'Col0LastClose']")[0]
            _quote["price"] = float(re.sub("[^0-9.]", "", price_cell.text))
            _quote["isin"] = page.xpath("//*[@id = 'Col0Isin']")[0].text

        _quote.pop("error", None)
    except Exception as e:
        _quote["error"] = "Error gathering security info: " + str(e)