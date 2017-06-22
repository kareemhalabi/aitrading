from flask import Flask, jsonify, request
from morningstar_crawler import *

ai_trading = Flask(__name__)

@ai_trading.route('/')
def index():
    return ai_trading.send_static_file("trade.html")


@ai_trading.route('/noscript')
def no_script():
    return ai_trading.send_static_file("noscript.html")


@ai_trading.route('/search_by_isin', methods=["GET"])
def search_by_isin():
    return jsonify(find_by_isin(request.args.get("isin"), request.args.get("currency")))

@ai_trading.route('/search_by_ticker', methods=["GET"])
def search_by_ticker():
    return jsonify(find_by_ticker(request.args.get("ticker"), request.args.get("currency")))

if __name__ == "__main__":
    ai_trading.run(debug=True)