import csv
import datetime
import keen

from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import render

from aitrading.settings import DEBUG
from aitrading.models import AuthorizedUser
from aitrading.views import get_group, HttpResponse
from aitrading.sftp.portfolio_scraper import get_snapshots as snapshots


@login_required
def portfolio(request):
    try:
        if DEBUG != 'True':
            group = get_group(request.user.email)
            keen.add_event('portfolio_visits', {'group': group.get('group_account'), 'email': request.user.email})

        return render(request, 'portfolio/portfolio.html', {'title': 'AI Trading - Portfolio Details'})

    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)


@login_required
def get_snapshots(request):
    group = get_group(request.user.email)
    account_snapshots = snapshots(group.get('group_account'))
    if account_snapshots is None:
        return HttpResponseNotFound('No data available on server')

    return JsonResponse({'snapshots': account_snapshots})


@login_required
def download_portfolio_all(request):
    group = get_group(request.user.email)
    account_snapshots = snapshots(group.get('group_account'))
    if account_snapshots is None:
        return HttpResponseNotFound('No data available on server')

    rows = []
    for snapshot in account_snapshots:
        date = snapshot['as_of_date']
        fx_rate = snapshot['fx_rate']
        rows.append(
            {'as_of_date': date, 'sec_name': 'CAD Cash', 'asset_category': 'CASH & CASH EQUIVALENTS',
             'sector_name': 'CASH', 'currency': 'CAD', 'fx_rate': 1.0, 'local_total': snapshot['CAD_cash'],
             'base_total': snapshot['CAD_cash']})
        rows.append(
            {'as_of_date': date, 'sec_name': 'USD Cash', 'asset_category': 'CASH & CASH EQUIVALENTS',
             'sector_name': 'CASH', 'currency': 'USD', 'fx_rate': fx_rate, 'local_total': snapshot['USD_cash'],
             'base_total': snapshot['USD_cash'] * fx_rate})

        for security in snapshot['securities']:
            security_fx_rate = fx_rate if security['currency'] == 'USD' else 1.0
            security.update(
                {'as_of_date': date, 'fx_rate': security_fx_rate, 'local_price': security['price'], 'local_total': security['total'],
                 'base_price': security['price'] * security_fx_rate,
                 'base_total': security['total'] * security_fx_rate})
            rows.append(security)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="%s_All_Portfolio_Details_as_of_%s.csv"' % (
        group.get('group_account'), datetime.datetime.now().strftime('%Y-%m-%d'))

    headers = ['as_of_date', 'ticker', 'isin', 'sec_name', 'asset_category', 'sector_name', 'shares', 'currency',
               'fx_rate', 'local_price', 'local_total', 'base_price', 'base_total']

    writer = csv.DictWriter(response, headers, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)

    if DEBUG != 'True':
        keen.add_event('download_portfolio', {'group': group.get('group_account'), 'email': request.user.email})

    return response

@login_required
def download_portfolio_timeseries(request):
    group = get_group(request.user.email)
    account_snapshots = snapshots(group.get('group_account'))
    if account_snapshots is None:
        return HttpResponseNotFound('No data available on server')

    identifier = request.GET.get('identifier')

    headers = ['as_of_date', 'fx_rate', 'CAD_cash', 'USD_cash']
    rows = []
    for snapshot in account_snapshots:

        # Get fx_rate for conversion in base modes
        if 'base' in request.GET.get('value'):
            fx_rate = snapshot['fx_rate']
            value = request.GET.get('value')[:-5]
        else:
            fx_rate = 1
            value = request.GET.get('value')

        row = {
            'as_of_date': snapshot['as_of_date'],
            'fx_rate': snapshot['fx_rate'],
            'CAD_cash': snapshot['CAD_cash'],
            'USD_cash': snapshot['USD_cash'] * fx_rate
        }

        for security in snapshot['securities']:

            # Cash corrections
            if security['sec_name'] == 'RECEIVABLE FOR INVESTMENTS SOLD ':
                row[security['currency'] + '_cash'] += security['total'] * fx_rate

            elif security['sec_name'] == 'PAYABLE FOR INVESTMENTS PURCHASED ':
                row[security['currency'] + '_cash'] -= security['total'] * fx_rate

            else:
                # Convert price or total (but not shares) to base for USD securities
                security_value = security[value] * fx_rate if security['currency'] == 'USD' and value != 'shares' else security[value]

                if security_value != 0:

                    # Correction for extra spaces at the end of certain security names
                    if security[identifier][-1:] == ' ':
                        security[identifier] = security[identifier][:-1]

                    # Need to include currency since there is a possibility of having USD and CAD security with same ticker
                    security_id = security[identifier]+" ("+security['currency']+")"

                    # Add to headers if doesn't exist already
                    if security_id not in headers:
                        headers.append(security_id)

                    row[security_id] = security_value

        rows.append(row)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="%s_Portfolio_Time_Series_as_of_%s.csv"' % (
        group.get('group_account'), datetime.datetime.now().strftime('%Y-%m-%d'))

    writer = csv.DictWriter(response, headers, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(rows)

    if DEBUG != 'True':
        keen.add_event('download_timeseries', {'group': group.get('group_account'), 'email': request.user.email,
                                               'identifier': identifier, 'value': request.GET.get('value')})

    return response
