import csv
import re
import psycopg2, psycopg2.extras
from aitrading.sftp.pull_reports import get_db_conn


def get_portfolio(group_account):

    conn = get_db_conn()

    dict_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Filter by account number
    dict_cur.execute("""SELECT "As Of Date", "Local Currency Code", "Ticker", "ISIN", "Security Description 1",
                        "Security Description 2", "Shares/Par", "Local Price", "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail WHERE "Reporting Account Number" = '%s' """ % group_account)

    # Get all rows
    portfolio_rows = dict_cur.fetchall()

    portfolio = {}

    # Get As of date (Column E)
    portfolio["as_of_date"] = portfolio_rows[0]["As Of Date"]

    # First two rows are CAD and USD cash balances
    portfolio["CAD_cash"] = float(re.sub(',', '', portfolio_rows[0]["Local Market Value"]))
    del portfolio_rows[0]
    portfolio["USD_cash"] = float(re.sub(',', '', portfolio_rows[0]["Local Market Value"]))
    del portfolio_rows[0]

    # Format security info from string rows
    portfolio["securities"] = []
    for row in portfolio_rows:
        portfolio["securities"].append({
            'currency': row["Local Currency Code"],
            'ticker': row["Ticker"],
            'isin': row["ISIN"],
            'sec_name': row["Security Description 1"] + " " + row["Security Description 2"],
            'shares': int(re.sub(',|(\.\d*)?', '', row["Shares/Par"])),  # Removes decimal or thousand separator
            'price': float(re.sub(',', '', row["Local Price"])),
            'total': float(re.sub(',', '', row["Local Market Value"]))
        })

    return portfolio
