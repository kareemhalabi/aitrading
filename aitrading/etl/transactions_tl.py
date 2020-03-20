'''
Module handles the transform and load stages for transactions.
'''

import pandas

from aitrading.etl.db_client import get_db

TRANSACTION_DETAIL_COLUMNS = [
    "Reporting Account Number",
    "Security Description 1",
    "Security Description 2",
    "Shares/Par",
    "FX Receivables",
    "Transaction Category",
    "Transaction Description 1",
    "Transaction Description 2",
    "Posted Date",
    "Local Currency Code",
    "Local Txn Amount",
    "Local Cost",
    "Local Gain/Loss",
    "Local Price",
    "Currency Gain/Loss Base",
    "Base Exchange Rate",
    "Local Commission",
    "Local Fees",
    "Ticker",
    "ISIN"
]


def transform_transaction_detail_report(file):
    transactions_df = pandas.read_csv(file, usecols=TRANSACTION_DETAIL_COLUMNS, delimiter=',', quotechar='"',
                                      thousands=',', parse_dates=["Posted Date"], na_filter=False)

    # Rename columns
    transactions_df = transactions_df.rename(columns={
        "Reporting Account Number": "account",
        "Shares/Par": "shares_par",
        "FX Receivables": "fx_receivables",
        "Transaction Category": "tx_category",
        "Posted Date": "posted_date",
        "Local Currency Code": "currency",
        "Local Txn Amount": "tx_amount",
        "Local Cost": "original_cost",
        "Local Gain/Loss": "gain_loss",
        "Local Price": "price",
        "Currency Gain/Loss Base": "currency_gain_loss",
        "Base Exchange Rate": "base_fx_rate",
        "Ticker": "ticker",
        "ISIN": "isin"
    })

    # Concatenate and drop security description
    transactions_df["sec_name"] = (transactions_df["Security Description 1"] + " " +
                                   transactions_df["Security Description 2"]).str.rstrip()
    transactions_df = transactions_df.drop(columns=["Security Description 1", "Security Description 2"])

    # Concatenate and drop transaction description
    transactions_df["tx_description"] = (transactions_df["Transaction Description 1"] + " " +
                                         transactions_df["Transaction Description 2"]).str.rstrip()
    transactions_df = transactions_df.drop(columns=["Transaction Description 1", "Transaction Description 2"])

    # Add and drop commission and fees
    transactions_df["fees_and_commission"] = (transactions_df["Local Commission"].replace("", 0) +
                                              transactions_df["Local Fees"].replace("", 0))
    transactions_df = transactions_df.drop(columns=["Local Commission", "Local Fees"])

    return transactions_df


def load_transactions(transactions_df):
    transactions = transactions_df.to_dict("records")
    db = get_db()
    db.transactions.insert_many(transactions)
