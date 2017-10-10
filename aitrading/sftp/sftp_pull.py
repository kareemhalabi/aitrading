import paramiko
import socks
import os
import re
import datetime

reports_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'reports')

def fetch_reports():

    # Ignore on a weekend (Saturday is day 5, Sunday is day 6)
    if datetime.datetime.now().weekday() >= 5:
        return

    # Get the current list of reports and check if they are up to date
    print("Checking reports in " + str(reports_dir))
    all_reports = os.listdir(reports_dir)
    date_string = '_' +  datetime.datetime.now().strftime("%Y%m%d") + '_'
    current_reports = list(filter(lambda file_name: date_string in file_name, all_reports))

    # Fetch files if not up to date or none at all
    if len(current_reports) != len(all_reports) or len(all_reports) == 0:

        # Set up connection
        sock = socks.socksocket()

        # Parses a proxy URL of the form "user:pass@full.host.name:port"
        proxy_params = re.split('[(:\\@)]+', os.environ.get('QUOTAGUARDSTATIC_URL'))

        sock.set_proxy(
            proxy_type = socks.SOCKS5,
            username=proxy_params[0],
            password=proxy_params[1],
            addr=proxy_params[2],
            port=int(proxy_params[3])
        )

        username = 'wbnbno04'
        key = paramiko.DSSKey.from_private_key_file(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'id_dsa'))
        host = 'ftp5.pershing.com'
        port = 22

        # Connect to server
        sock.connect((host, port))
        transport = paramiko.Transport(sock)
        transport.connect(username=username, pkey=key)
        sftp = paramiko.SFTPClient.from_transport(transport)

        reports_to_pull = list(filter(lambda file_name: date_string in file_name, sftp.listdir()))
        print("Downloading: " + str(reports_to_pull))
        for file in reports_to_pull:
            sftp.get(file, os.path.join(reports_dir,file))

        # Close connection
        sftp.close()
        transport.close()
        sock.close()

        # Delete old files only if new reports pulled
        if len(reports_to_pull) != 0:

            old_files = list(filter(lambda file_name: date_string not in file_name, os.listdir(reports_dir)))
            print("Deleting: " + str(old_files))
            for old_file in old_files:
                os.remove(os.path.join(reports_dir, old_file))
