import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

ai_trading = Flask(__name__)
ai_trading.config['DEBUG'] = os.environ.get('FLASK_DEBUG')
ai_trading.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')

db = SQLAlchemy(ai_trading)

class AuthorizedUser(db.Model):
    email = db.Column(db.String(255), primary_key=True, unique=True)
    account = db.Column(db.String(12))

    def __init__(self, email, account):
        self.email = email
        self.account = account

    def __repr__(self):
        return '<User %r, Account %r>' % (self.email, self.account)

from views import *

if __name__ == "__main__":
    db.create_all()
    ai_trading.run(host= '0.0.0.0')
