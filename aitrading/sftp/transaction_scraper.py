from datetime import datetime, date
import re

from aitrading.sftp.pull_reports import get_db_conn
import psycopg2
import psycopg2.extras


def save_transactions():
    conn = get_db_conn()
    cur = conn.cursor()
    dict_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Check if transaction table exists
    cur.execute("SELECT exists(SELECT * FROM information_schema.tables WHERE table_name=%s);", ("transaction_history",))
    if not cur.fetchone()[0]:
        # Create table
        cur.execute('''CREATE TABLE transaction_history (
                          id SERIAL PRIMARY KEY,
                          account VARCHAR(12),
                          security VARCHAR,
                          shares_par FLOAT,
                          fx_receivables FLOAT,
                          tx_category VARCHAR,
                          tx_description VARCHAR,
                          posted_date DATE,
                          currency VARCHAR(3),
                          tx_amount FLOAT,
                          original_cost FLOAT,
                          gain_loss FLOAT,
                          price INT,
                          currency_gain_loss FLOAT,
                          base_fx_rate FLOAT,
                          fees_and_commission FLOAT,
                          ticker VARCHAR,
                          isin VARCHAR                          
                    );''')

    # Get the latest date from both original transaction report and reduced transaction detail table
    cur.execute('SELECT "Posted Date" FROM report_transaction_detail')
    latest_tx_report_date = cur.fetchone()[0]

    cur.execute('SELECT MAX(posted_date) FROM transaction_history AS "Latest Date"')
    latest_tx_history_date = cur.fetchone()[0]  # Returns a date object

    # Do not update transaction_history if latest_tx_history_date exists and is newer or present to latest_tx_report_date
    # (also checked for existence)
    if (latest_tx_history_date is not None) and (latest_tx_report_date is not None)\
            and latest_tx_history_date >= datetime.strptime(latest_tx_report_date, '%m/%d/%Y').date():
        return

    # Get all new transactions
    dict_cur.execute("""SELECT "Reporting Account Number", "Security Description 1", "Security Description 2",
                        "Shares/Par", "FX Receivables", "Transaction Category", "Transaction Description 1",
                        "Transaction Description 2", "Posted Date", "Local Currency Code", "Local Txn Amount",
                        "Local Cost", "Local Gain/Loss", "Local Price", "Currency Gain/Loss Base", "Base Exchange Rate",
                        "Local Commission", "Local Fees", "Ticker", "ISIN" FROM report_transaction_detail;""")

    transactions = dict_cur.fetchall()

    post_date = None
    if len(transactions) > 0:
        post_date = datetime.strptime(transactions[0]["Posted Date"], '%m/%d/%Y').date()

    for transaction in transactions:
        columns = (
            transaction["Reporting Account Number"],
            transaction["Security Description 1"] + " " + transaction["Security Description 2"],
            int(re.sub(',|(\.\d*)?', '', transaction["Shares/Par"])),
            int(re.sub(',|(\.\d*)?', '', transaction["FX Receivables"])),
            transaction["Transaction Category"],
            transaction["Transaction Description 1"] + " " + transaction["Transaction Description 2"],
            datetime.strptime(transaction["Posted Date"], '%m/%d/%Y').date(),
            transaction["Local Currency Code"],
            float(re.sub(',', '', transaction["Local Txn Amount"])),
            float(re.sub(',', '', transaction["Local Cost"])),
            float(re.sub(',', '', transaction["Local Gain/Loss"])),
            float(re.sub(',', '', transaction["Local Price"])),
            float(re.sub(',', '', transaction["Currency Gain/Loss Base"])),
            float(re.sub(',', '', transaction["Base Exchange Rate"])),
            float(re.sub(',', '', transaction["Local Commission"])) + float(re.sub(',', '', transaction["Local Fees"])),
            transaction["Ticker"],
            transaction["ISIN"]
        )

        insert_statement = 'INSERT INTO transaction_history VALUES(DEFAULT, ' + '%s, ' * (len(columns)-1) + '%s );'

        cur.execute(insert_statement, columns)

    conn.commit()

    return post_date

def get_transactions(account, date_min=date.min, date_max=date.max):
    # Both dates are inclusive

    # Connect to a database
    conn = get_db_conn()
    dict_cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    dict_cur.execute('''SELECT * from transaction_history WHERE account=%s AND posted_date >=%s AND posted_date <=%s
                    ORDER BY posted_date''', (account, date_min, date_max))

    return dict_cur.fetchall()
