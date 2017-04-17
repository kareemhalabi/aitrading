from flask import Flask

ai_trading = Flask(__name__)


@ai_trading.route('/')
def hello_world():
    return '<h1> Hello World! </h1>'


if __name__ == '__main__':
    ai_trading.run()
