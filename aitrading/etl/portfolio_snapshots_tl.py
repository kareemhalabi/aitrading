'''
Module handles the transform and load stages for the portfolio snapshots.
'''

import numpy as np
import pandas
from pymongo.errors import DuplicateKeyError

from aitrading.etl.db_client import get_db

TRDSHT_ASSET_AND_ACCRUAL_DETAIL_COLUMNS = [
    "Reporting Account Number",
    "As Of Date",
    "Local Currency Code",
    "Ticker",
    "ISIN",
    "Security Description 1",
    "Security Description 2",
    "Asset Category",
    "Sector Name",
    "Shares/Par",
    "Local Price",
    "Local Market Value",
    "Exchange Rate",
]


def transform_asset_and_accrual_detail_report(file):
    assets_df = pandas.read_csv(file, usecols=TRDSHT_ASSET_AND_ACCRUAL_DETAIL_COLUMNS, delimiter=',', quotechar='"',
                                thousands=',', parse_dates=["As Of Date"], na_filter=False)

    # Rename Columns
    assets_df = assets_df.rename(columns={
        "Reporting Account Number": "account",
        "Local Currency Code": "currency",
        "Ticker": "ticker",
        "ISIN": "isin",
        "Asset Category": "asset_category",
        "Sector Name": "sector_name",
        "Shares/Par": "shares",
        "Local Price": "price",
        "Local Market Value": 'total',
    })

    # Concatenate security description columns and drop
    assets_df["sec_name"] = (assets_df["Security Description 1"] + " " + assets_df["Security Description 2"])\
        .str.rstrip()  # rstrip removes possible trailing whitespace
    assets_df = assets_df.drop(columns=["Security Description 1", "Security Description 2"])

    # Get the date then drop the date column
    as_of_date = assets_df["As Of Date"].iloc[0]
    assets_df = assets_df.drop(columns=["As Of Date"])

    # Get the exchange rate then drop the exchange rate column
    fx_rate = 0
    try:
        fx_rate = assets_df.loc[(assets_df["asset_category"] != 'CASH & CASH EQUIVALENTS')
                                       & (assets_df["currency"] == 'USD')
                                       & (assets_df["Exchange Rate"] != 0.00)]
        fx_rate = fx_rate["Exchange Rate"].iloc[0]
    except:
        print("No FX rate available")
    assets_df = assets_df.drop(columns=["Exchange Rate"])

    # Get the list of accounts
    accounts = assets_df["account"].unique().tolist()

    return accounts, as_of_date, fx_rate, assets_df


def load_portfolio_snapshot(account, as_of_date, fx_rate, assets_df):
    portfolio_assets = assets_df[assets_df["account"] == account].drop(columns=["account"])

    # Get CAD_cash then drop the CAD_cash row
    cad_cash = 0
    try:
        cad_cash = portfolio_assets.loc[(portfolio_assets["sec_name"] == "CASH")]["total"].iloc[0]
        portfolio_assets = portfolio_assets.loc[(portfolio_assets["sec_name"] != "CASH")]
    except:
        print("No CAD cash for ", account)

    # Get USD_cash then drop the USD_cash row
    usd_cash = 0
    try:
        usd_cash = portfolio_assets[portfolio_assets["sec_name"] == "NON-BASE CURRENCY"]["total"].iloc[0]
        portfolio_assets = portfolio_assets[portfolio_assets["sec_name"] != "NON-BASE CURRENCY"]
    except:
        print("No USD cash for ", account)

    # Convert remaining dataframe to securities list
    securities = portfolio_assets.to_dict("records")

    portfolio_snapshot = {
        "account": account,
        "as_of_date": as_of_date,
        "CAD_cash": cad_cash,
        "USD_cash": usd_cash,
        "fx_rate": fx_rate,
        "securities": securities
    }

    db = get_db()
    try:
        db.portfolio_snapshots.insert_one(portfolio_snapshot)
    except DuplicateKeyError as e:
        print("Portfolio Snapshot {%s, %s} already exists"
              % (portfolio_snapshot["account"], portfolio_snapshot["as_of_date"]))
