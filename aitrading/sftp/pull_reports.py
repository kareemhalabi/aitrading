import csv
import os
import re
import paramiko
import psycopg2
import socks
from django.core.mail import EmailMessage

from aitrading.settings import DATABASES

sftp_dir = os.path.dirname(os.path.realpath(__file__))


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


def get_db_conn():
    return psycopg2.connect(dbname=DATABASES['default']['NAME'], user=DATABASES['default']['USER'],
                            password=DATABASES['default']['PASSWORD'], host=DATABASES['default']['HOST'],
                            port=DATABASES['default']['PORT'])


def main():
    sftp = get_sftp()

    sftp.chdir('/outbound/workbench/')

    # Only get csv files and sort alphabetically, this sorts each report by date (in case more than one exists)
    # Because filenames are structured as 'Example_Report_Name_YYYYMMDDHHMMSS_9DigitDocID_8DigitDistCode.csv'
    dir_files = sorted(list(filter(lambda file_name: '.csv' in file_name, sftp.listdir())))

    # Iterate through sorted file list in reverse order (we want to go from newest to oldest
    # only picking up most recent reports of each type
    most_recent_reports = []
    previous_report_name = ''
    for file in reversed(dir_files):
        # Extracts report name by splitting on _YYYYMMDDHHMMSS_
        current_report_name = re.split('_\d{14}_', file)[0]

        if current_report_name != previous_report_name:
            previous_report_name = current_report_name
            # report name will match database tablename: 'report_example_report_name'
            most_recent_reports.append({'name': 'report_' + str.lower(current_report_name), 'filename': file})

    # Connect to a database
    conn = None
    try:
        conn = get_db_conn()
        cur = conn.cursor()

    except:
        print("Could not connect to the database")
        exit(1)

    # Iterate through each report and update it's corresponding database table
    for report in most_recent_reports:

        # Get the appropriate file
        with sftp.file(report['filename'], mode='r') as csv_report:

            # Strip header to check for column mismatch
            report_reader = csv.reader(csv_report, delimiter=',', quotechar='"')
            header = next(report_reader)

            # Check if database table exists
            table_name = report['name']
            cur.execute("SELECT exists(SELECT * FROM information_schema.tables WHERE table_name=%s);", (table_name,))
            if not cur.fetchone()[0]:
                # Create table (needs string interpolation since table names cannot be parametrized)
                cur.execute('CREATE TABLE %s (%s);'
                            % (table_name, ', '.join('"{0}" varchar'.format(column) for column in header)))

            else:
                cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name=%s;", (table_name,))
                columns = [tup[0] for tup in cur.fetchall()]
                # Check for column mismatch
                if header != columns:
                    # Recreate table (needs string interpolation since table names cannot be parametrized)
                    cur.execute("DROP TABLE %s;" % table_name)
                    cur.execute('CREATE TABLE %s (%s);'
                                % (table_name, ', '.join('"{0}" varchar'.format(column) for column in header)))

                # Table exists and no column mismatch
                else:
                    # Truncate table to make room for new data (needs string interpolation since table names cannot be parametrized)
                    cur.execute("TRUNCATE TABLE %s;" % table_name)

            cur.copy_expert("COPY %s FROM STDIN WITH CSV DELIMITER AS ',';" % table_name, csv_report)

            conn.commit()

    # Local import needed to prevent cyclic import
    from aitrading.sftp.portfolio_scraper import save_snapshots
    save_snapshots()

    from aitrading.sftp.transaction_scraper import save_transactions
    post_date = save_transactions()
    print(post_date)


if __name__ == "__main__":
    try:
        main()
    except:
        import sys, cgitb
        msg = EmailMessage(
            to=[os.environ.get('DEVELOPER_EMAIL')],
            subject='Exception Raised in ' + __file__,
            body=cgitb.html(sys.exc_info())
        )
        msg.content_subtype = 'html'
        msg.send()
