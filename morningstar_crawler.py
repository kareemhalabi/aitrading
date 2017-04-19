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

quote = {}

def find_by_ISIN(ISIN, currency):
    quote["currency"] = currency

    b.visit(MORNINGSTAR_BASE_URL + ISIN)

    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "
    xpath_search = xpath_search[:-3] + ")]"

    result = b.find_by_xpath(xpath_search).first
    quote["ticker"] = result.text.split(":",1)[1]

    link = result.find_by_xpath('.//ancestor::tr/td[1]/a').first

    _get_secutity_info(link)

    return quote

def find_by_ticker(ticker, currency):
    quote["ticker"] = ticker
    quote["currency"] = currency

    b.visit(MORNINGSTAR_BASE_URL + ticker)

    xpath_search = "//span[("
    for exch in ALLOWED_EXCHANGES[currency]:
        xpath_search += "contains(.,'" + exch + "') or "
    xpath_search = xpath_search[:-3] + ") and contains(.,':" + ticker + "')]"

    result = b.find_by_xpath(xpath_search).first
    link = result.find_by_xpath('.//ancestor::tr/td[1]/a').first

    _get_secutity_info(link)

    return quote

def _get_secutity_info(link):

    quote["security"] = filter(lambda x : x in set(string.printable), link.text) # removes any weird characters

    b.visit(link['href'])

    if 'etf' in link['href']:
        price_cell = b.find_by_xpath("//tr[contains(.,'Closing Price')]/td[3]")
        quote["last_close_price"] = float(re.sub("[^0-9.]", "", price_cell.text))
        quote["ISIN"] = b.find_by_xpath("//tr[contains(.,'ISIN')]/td[3]").text

    else:
        quote["last_close_price"] = float(b.find_by_id("Col0LastClose").text)
        quote["ISIN"] = b.find_by_id('Col0Isin').text


#print find_by_ticker(raw_input('Enter ticker: ').upper(), raw_input('Enter CAD/USD: ').upper())

print find_by_ISIN(raw_input('Enter ISIN: '), raw_input('Enter CAD/USD: ').upper())
