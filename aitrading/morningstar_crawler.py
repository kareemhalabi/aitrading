"""
This file pulls data from Morningstar UK (since it is the only public facing site with ISIN numbers)
by interacting directly with the website. This is not the most elegant solution and could possibly break
if Morningstar changes how their website works.
"""

import re, string
from lxml import html
import requests

ALLOWED_EXCHANGES = {'CAD':['TSX', 'TSE'],'USD':['ARCA', 'AMEX', 'PINX', 'BATS','NAS','NASDAQ','NYSE']}
MORNINGSTAR_BASE_URL = 'https://www.morningstar.ca/ca/funds/SecuritySearchResults.aspx?search='


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
        xpath_search += "contains(.,'" + exch + ':'+ ticker+"') or "

    # needs to start at -3 to override the last "or"
    xpath_search = xpath_search[:-3] + ") and contains(.,':" + ticker + "')]"

    try:
        pos = 0
        result = page.xpath(xpath_search)[pos]

        while(result.xpath('.//ancestor::tr/td[3]/span')[0].text != currency or result.text.split(":", 1)[1]!= ticker):
            pos +=1
            result =page.xpath(xpath_search)[pos]
           
                

        link = result.xpath('.//ancestor::tr/td[1]/a')[0]

    except:
        _quote["error"] = "Invalid ticker/currency pair"
        return _quote

    _get_secutity_info(link)

    return _quote

def _get_secutity_info(link):

    _quote["sec_name"] = ''.join(filter(lambda x : x in string.printable, link.text)) # removes any weird characters
    href = link.attrib['href']

    # Some hrefs are relative, need to add back the domain
    if 'etf' in href:
        serial_num = re.split("=", href)[1]
        serial_num = re.split("&",serial_num)[0]
        url = 'https://tools.morningstar.co.uk/uk/stockreport/default.aspx?SecurityToken='+serial_num+']3]0]E0WWE$$ALL'
    else:
        serial_num = re.split("=", href)[1]
        url = 'https://tools.morningstar.co.uk/uk/stockreport/default.aspx?SecurityToken='+serial_num+']3]0]E0WWE$$ALL'

    page = html.fromstring(requests.get(url).content)


    # ETF pages have a different layout than Stock pages
    try:
       
        
        _quote["price"] =   float(re.sub("[^0-9.]", "", page.xpath('//*[@id="Col0Price"]')[0].text))    
         
        _quote["isin"] = page.xpath("//*[@id = 'Col0Isin']")[0].text
        _quote.pop("error", None)
    except Exception as e:
        _quote["error"] = "Error gathering security info: " + str(e)
