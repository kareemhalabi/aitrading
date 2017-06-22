from flask import Flask, jsonify, request, render_template, Markup
from morningstar_crawler import *

ai_trading = Flask(__name__)


@ai_trading.route('/')
def index():
    return ai_trading.send_static_file("trade.html")


@ai_trading.route('/noscript')
def no_script():
    redir = request.args.get("redirect")

    # Prevent erroneous redirects
    if redir[0] != "/":
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


if __name__ == "__main__":
    ai_trading.run(debug=True)
