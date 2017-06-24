import os
from flask import Flask

ai_trading = Flask(__name__)
ai_trading.config['DEBUG'] = os.environ.get('FLASK_DEBUG')

from views import *

if __name__ == "__main__":
    ai_trading.run()
