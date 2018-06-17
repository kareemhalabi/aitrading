import re
from datetime import datetime, date

import psycopg2
import psycopg2.extras
from psycopg2._json import Json

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

    try:
        portfolio["CAD_cash"] = float(re.sub(',', '', dict_cur.fetchone()["Local Market Value"]))
    except:
        print("No CAD cash for %s" % group_account)
        portfolio["CAD_cash"] = 0

    # Get USD Cash
    dict_cur.execute("""SELECT "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Security Description 1" = 'NON-BASE CURRENCY' AND  "Reporting Account Number" = %s;""",
                        (group_account,))

    try:
        portfolio["USD_cash"] = float(re.sub(',', '', dict_cur.fetchone()["Local Market Value"]))
    except:
        print("No USD cash for %s" % group_account)
        portfolio["USD_cash"] = 0

    # Get conversion rate
    dict_cur.execute("""SELECT "Exchange Rate"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Asset Category" != 'CASH & CASH EQUIVALENTS'
                        AND "Local Currency Code" = 'USD'
                        AND "Exchange Rate" != '0.00000000000';""")

    try:
        portfolio["fx_rate"] = float(dict_cur.fetchone()["Exchange Rate"])
    except:
        print("No FX rate available for %s" % group_account)
        portfolio["fx_rate"] = 0

    # Get securities
    dict_cur.execute("""SELECT "As Of Date", "Local Currency Code", "Ticker", "ISIN", "Security Description 1",
                        "Security Description 2", "Asset Category", "Sector Name", "Shares/Par", "Local Price",
                        "Local Market Value"
                        FROM report_trdsht_asset_and_accrual_detail
                        WHERE "Reporting Account Number" = %s AND "Security Description 1" != 'NON-BASE CURRENCY'
                        AND "Security Description 1" != 'CASH';""", (group_account,))

    securities = dict_cur.fetchall()

    # Get As of date (Column E)
    try:
        portfolio["as_of_date"] = securities[0]["As Of Date"]
    except:
        print("No As of Date available for %s" % group_account)
        dict_cur.execute("""SELECT "As Of Date" FROM report_trdsht_asset_and_accrual_detail""")
        portfolio["as_of_date"] = dict_cur.fetchone()["As Of Date"]

    # Format security info from string rows
    portfolio["securities"] = []
    for row in securities:
        portfolio["securities"].append({
            'currency': row["Local Currency Code"],
            'ticker': row["Ticker"],
            'isin': row["ISIN"],
            'sec_name': row["Security Description 1"] + " " + row["Security Description 2"],
            'asset_category': row["Asset Category"],
            'sector_name': row["Sector Name"],
            'shares': int(re.sub(',|(\.\d*)?', '', row["Shares/Par"])),  # Removes decimal or thousand separator
            'price': float(re.sub(',', '', row["Local Price"])),
            'total': float(re.sub(',', '', row["Local Market Value"]))
        })

    return portfolio


def save_snapshots():

    # Connect to a database
    conn = get_db_conn()
    cur = conn.cursor()

    # Check if snapshot table exists
    cur.execute("SELECT exists(SELECT * FROM information_schema.tables WHERE table_name=%s);", ("portfolio_snapshot",))
    if not cur.fetchone()[0]:
        # Create table
        cur.execute('''CREATE TABLE portfolio_snapshot (
                            id SERIAL PRIMARY KEY,
                            date DATE,
                            account VARCHAR(12),
                            portfolio JSON                            
                        );''')

    # Get the latest date from both asset and accrual detail report and portfolio snapshots
    cur.execute('SELECT "As Of Date" FROM report_trdsht_asset_and_accrual_detail')
    latest_report_date = datetime.strptime(cur.fetchone()[0], '%m/%d/%Y').date()

    cur.execute('SELECT MAX(date) FROM portfolio_snapshot AS "Latest Date"')
    latest_snapshot_date = cur.fetchone()[0]  # Returns a date object

    # Do not update snapshots if latest_snapshot_date exists and is newer or present to latest_report_date
    if (latest_snapshot_date is not None) and latest_snapshot_date >= latest_report_date:
        return

    # TODO check if latest report date's year is ahead of latest snapshot's year
    # This means a new calendar year has begun and all the snapshots of the previous year can be deleted

    # Get list of all accounts
    cur.execute('''SELECT DISTINCT "Reporting Account Number" FROM report_trdsht_asset_and_accrual_detail
                   ORDER BY "Reporting Account Number"; ''')
    accounts_list = cur.fetchall()

    for account in accounts_list:
        portfolio = get_portfolio(account)
        cur.execute('''INSERT INTO portfolio_snapshot (date, account, portfolio)
                       VALUES (%s, %s, %s); ''',
                    (latest_report_date, account, Json(portfolio)))

    conn.commit()


def get_snapshots(account, date_min=date.min, date_max=date.max):
    # Both dates are inclusive

    # Connect to a database
    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute('''SELECT portfolio FROM portfolio_snapshot WHERE account=%s AND date >=%s AND date <=%s
                    ORDER BY date''', (account, date_min, date_max))

    snapshots_sorted_by_date = [row[0] for row in cur.fetchall()] # Extract portfolio dict from surrounding tuple
    return snapshots_sorted_by_date
