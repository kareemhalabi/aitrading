from flask import render_template, request, jsonify
from markupsafe import Markup

from ai_trading import ai_trading
from morningstar_crawler import find_by_isin, find_by_ticker


@ai_trading.route('/')
def index():
    return render_template("trade.html")


@ai_trading.route('/noscript')
def no_script():
    redir = request.args.get("redirect")

    # Prevent erroneous redirects
    if len(redir) == 0 or redir[0] != "/":
        redirect_srcipt = Markup("")
    else:
        redirect_srcipt = Markup('window.location.replace("%s");' % redir)

    return render_template("noscript.html", redirect=redirect_srcipt)


@ai_trading.route('/search_by_isin', methods=["GET"])
def search_by_isin():
    return jsonify(find_by_isin(request.args.get("isin"), request.args.get("currency")))


@ai_trading.route('/search_by_ticker', methods=["GET"])
def search_by_ticker():
    return jsonify(find_by_ticker(request.args.get("ticker"), request.args.get("currency")))
