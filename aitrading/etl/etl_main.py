'''
Module is the entry point to the Extraction, Transformation and Loading (ETL) pipeline.

Handles the extract phase and calls the transform and loading phases for portfolio snapshots and transactions.
All tracebacks are sent via email which include the report file that caused the error.
'''

import os
import re

import paramiko
import pymongo
import socks
from django.core.mail import EmailMessage

from aitrading.etl.db_client import get_db
from aitrading.etl.portfolio_snapshots_tl import transform_asset_and_accrual_detail_report, load_portfolio_snapshot
from aitrading.etl.transactions_tl import transform_transaction_detail_report, load_transactions


def setup_db():
    """
    Run this function to set up the Mongo DB for the first time
    """
    db = get_db()
    db.portfolio_snapshots.create_index([('account', pymongo.ASCENDING), ('date', pymongo.ASCENDING)], unique=True)


def get_sftp():
    sock = socks.socksocket()

    username = os.environ.get('SFTP_USERNAME')
    key = paramiko.DSSKey.from_private_key_file(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'id_dsa'),
                                                password=os.environ.get('PKEY_PASSWORD'))

    host = os.environ.get('SFTP_HOST')
    port = int(os.environ.get('SFTP_PORT'))

    # Connect to server
    sock.connect((host, port))
    transport = paramiko.Transport(sock)
    transport.connect(username=username, pkey=key)
    return paramiko.SFTPClient.from_transport(transport)


def extract_reports(file_list):
    trdsht_asset_and_accrual_detail_reports = \
        list(filter(lambda file_name: re.match(r"^TRDSHT_Asset_And_Accrual_Detail.*\.csv$", file_name),
                    file_list))

    transaction_detail_reports = \
        list(filter(lambda file_name: re.match(r"^Transaction_Detail.*\.csv$", file_name), file_list))

    return trdsht_asset_and_accrual_detail_reports, transaction_detail_reports


def send_error_email(subject, filename=None, file=None):
    import sys, cgitb
    msg = EmailMessage(
        to=[os.environ.get('DEVELOPER_EMAIL')],
        subject=subject,
        body=cgitb.html(sys.exc_info())
    )
    msg.content_subtype = 'html'
    if filename is not None and file is not None:
        file.seek(0)
        msg.attach(filename, file.read(), 'text/csv')
    msg.send()


if __name__ == '__main__':
    sftp_client = None
    assets, transactions = None, None
    try:
        sftp_client = get_sftp()
        sftp_client.chdir('/outbound/workbench/')

        assets, transactions = extract_reports(sftp_client.listdir())
    except:
        send_error_email("Failed to extract reports")
        exit(1)

    for report in assets:
        with sftp_client.file(report, mode='r') as report_file:
            try:
                accounts, as_of_date, fx_rate, assets_df = transform_asset_and_accrual_detail_report(report_file)
                for account in accounts:
                    try:
                        load_portfolio_snapshot(account, as_of_date, fx_rate, assets_df)
                    except:
                        send_error_email("Failed to load account %s" % account, report, report_file)
            except:
                send_error_email("Failed to transform %s" % report, report, report_file)

    for report in transactions:
        with sftp_client.file(report, mode='r') as report_file:
            transactions_df = None
            try:
                transactions_df = transform_transaction_detail_report(report_file)
            except:
                send_error_email("Failed to transform %s" % report, report, report_file)
                continue
            try:
                load_transactions(transactions_df)
            except:
                send_error_email("Failed to load %s" % report, report, report_file)
