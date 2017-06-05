from flask import Flask, jsonify, request
from morningstar_crawler import *

ai_trading = Flask(__name__)

@ai_trading.route('/')
def index():
    return ai_trading.send_static_file("trade.html")


@ai_trading.route('/search_by_isin', methods=["GET"])
def search_by_isin():
    return jsonify(find_by_ISIN(request.args.get("ISIN"), request.args.get("currency")))


if __name__ == "__main__":
    ai_trading.run(debug=True)