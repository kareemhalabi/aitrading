import csv
import re
import os
from aitrading.sftp.sftp_pull import reports_dir

# Convert upper case single character excel column to 0 based index
def get_col_num(col):
    return int(ord(col) - ord('A'))


def get_portfolio(group_account):

    # Get the latest portfolio filename
    latest_list = sorted(list(filter(lambda filename: 'TRDSHT' in filename, os.listdir(reports_dir))))

    # No files exist
    if len(latest_list) == 0:
        return None

    portfolio = {}

    with open(os.path.join(reports_dir, latest_list[0]), 'r') as csvfile:
        reader = csv.reader(csvfile)

        # Filter by account number
        portfolio_rows = list(filter(lambda asset: asset[0] == group_account, reader))

        # Get As of date (Column E)
        portfolio["as_of_date"] = portfolio_rows[0][get_col_num('E')]

        # First two rows are CAD and USD cash balances
        portfolio["CAD_cash"] = float(re.sub(',', '', portfolio_rows[0][get_col_num('Z')]))
        del portfolio_rows[0]
        portfolio["USD_cash"] = float(re.sub(',', '', portfolio_rows[0][get_col_num('Z')]))
        del portfolio_rows[0]

        # Get security info from specific cells
        portfolio["securities"] = []
        for row in portfolio_rows:
            portfolio["securities"].append({
                'currency': row[get_col_num('N')],
                'ticker': row[26 + get_col_num('X')],  # For column AX
                'isin': row[26 + get_col_num('Y')],  # For column AY
                'sec_name': row[get_col_num('F')] + " " + row[get_col_num('G')],
                'shares': int(re.sub(',|(\.\d*)?', '', row[get_col_num('R')])),  # Removes decimal or thousand separator
                'price': float(re.sub(',', '', row[get_col_num('V')])),
                'total': float(re.sub(',', '', row[get_col_num('Z')]))
            })

    return portfolio
