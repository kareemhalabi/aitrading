import re
import psycopg2, psycopg2.extras
from aitrading.sftp.pull_reports import get_db_conn


def get_portfolio(group_account):

    conn = get_db_conn()

    dict_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    portfolio = {}

    # Get CAD Cash
    dict_cur.execute("""SELECT "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Security Description 1" = 'CASH' AND  "Reporting Account Number" = %s;""",
                        (group_account,))

    portfolio["CAD_cash"] = float(re.sub(',', '', dict_cur.fetchone()["Local Market Value"]))

    # Get USD Cash
    dict_cur.execute("""SELECT "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Security Description 1" = 'NON-BASE CURRENCY' AND  "Reporting Account Number" = %s;""",
                        (group_account,))

    portfolio["USD_cash"] = float(re.sub(',', '', dict_cur.fetchone()["Local Market Value"]))

    # Get conversion rate
    dict_cur.execute("""SELECT "Exchange Rate"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Asset Category" != 'CASH & CASH EQUIVALENTS'
                        AND "Local Currency Code" = 'USD';""")

    portfolio["fx_rate"] = float(dict_cur.fetchone()["Exchange Rate"])

    # Get securities
    dict_cur.execute("""SELECT "As Of Date", "Local Currency Code", "Ticker", "ISIN", "Security Description 1",
                        "Security Description 2", "Shares/Par", "Local Price", "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Reporting Account Number" = %s AND "Security Description 1" != 'NON-BASE CURRENCY'
                        AND "Security Description 1" != 'CASH';""", (group_account,))

    securities = dict_cur.fetchall()

    # Get As of date (Column E)
    portfolio["as_of_date"] = securities[0]["As Of Date"]

    # Format security info from string rows
    portfolio["securities"] = []
    for row in securities:
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
