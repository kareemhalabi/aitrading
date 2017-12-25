import csv
import os
import re
import paramiko
import psycopg2
import socks

from aitrading.settings import DATABASES

sftp_dir = os.path.dirname(os.path.realpath(__file__))


def get_sftp():
    sock = socks.socksocket()

    proxy_params = re.split('[(:\\@)]+', os.environ.get('QUOTAGUARDSTATIC_URL'))

    sock.set_proxy(
        proxy_type=socks.SOCKS5,
        username=proxy_params[0],
        password=proxy_params[1],
        addr=proxy_params[2],
        port=int(proxy_params[3])
    )

    username = 'wbnbno04'
    key = paramiko.DSSKey.from_private_key_file(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'id_dsa'),
                                                password=os.environ.get('PKEY_PASSWORD'))
    host = 'ftp5.pershing.com'
    port = 22

    # Connect to server
    sock.connect((host, port))
    transport = paramiko.Transport(sock)
    transport.connect(username=username, pkey=key)
    return paramiko.SFTPClient.from_transport(transport)


def get_db_conn():
    return psycopg2.connect(dbname=DATABASES['default']['NAME'], user=DATABASES['default']['USER'],
                            password=DATABASES['default']['PASSWORD'], host=DATABASES['default']['HOST'],
                            port=DATABASES['default']['PORT'])


if __name__ == "__main__":
    sftp = get_sftp()

    # Only get csv files and sort alphabetically, this sorts each report by date (in case more than one exists)
    # Because filenames are structured as 'Example_Report_Name_YYYYMMDD_MORENUMBERS_MORENUMBERS.csv'
    dir_files = sorted(list(filter(lambda file_name: '.csv' in file_name, sftp.listdir())))

    # Iterate through sorted file list in reverse order (we want to go from newest to oldest
    # only picking up most recent reports of each type
    most_recent_reports = []
    previous_report_name = ''
    for file in reversed(dir_files):
        # Extracts report name by splitting on _YYYYMMDD_
        # (_MORENUMBERS_ tend to be more than 8 so the regex won't match against them)
        current_report_name = re.split('_\d{8}_', file)[0]

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

        # Ensure our temp file does not already exist
        try:
            os.remove(os.path.join(sftp_dir, 'temp.csv'))
        except:
            pass

        # Get the appropriate file
        with sftp.file(report['filename'], mode='r') as csv_report_commas, \
                open(os.path.join(sftp_dir, 'temp.csv'), mode='w', newline='') as csv_report_semicolons:

            # Need to convert delimiter to ; since too many commas occur in reports
            # Semicolon most likely will not appear in data
            # These commas prevent cur.copy_from() to execute properly
            report_reader = csv.reader(csv_report_commas, delimiter=',')
            header = next(report_reader)  # strip header before writing back

            writer = csv.writer(csv_report_semicolons, delimiter=';')
            for row in report_reader:
                writer.writerow(row)

            csv_report_semicolons.close()

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

            # Use temporary file to load database
            with open(os.path.join(sftp_dir, 'temp.csv'), mode='r') as csv_report:
                cur.copy_from(csv_report, table_name, sep=';')

            # Delete temporary file
            os.remove(os.path.join(sftp_dir, 'temp.csv'))

            conn.commit()

    # Local import needed to prevent cyclic import
    from aitrading.sftp.portfolio_scraper import save_snapshots
    save_snapshots()