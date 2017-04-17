from flask import Flask

ai_trading = Flask(__name__)


@ai_trading.route('/')
def hello_world():
    return 'Hello World!'


if __name__ == '__main__':
    ai_trading.run()
