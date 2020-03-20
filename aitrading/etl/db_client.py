'''
Client module for web backend to fetch financial data from MongoDB
'''
import os

import pymongo
from pymongo import MongoClient


def get_db():
    client = MongoClient(os.environ.get('MONGODB_URI'))
    return client.get_default_database()


def get_snapshots(account, latest=False):
    db = get_db()
    if latest:
        cursor = db.portfolio_snapshots.find({"account": account}, {"_id": False})\
            .sort("as_of_date", pymongo.DESCENDING)\
            .limit(1)
        return next(cursor)

    else:
        cursor = db.portfolio_snapshots.find({"account": account}, {"_id": False})
        return list(cursor)


def get_transactions(account):
    db = get_db()
    cursor = db.transactions.find({"account": account}, {"_id": False})
    return list(cursor)
