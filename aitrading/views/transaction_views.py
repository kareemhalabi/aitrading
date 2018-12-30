import csv
import datetime
import keen

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from aitrading.settings import DEBUG
from aitrading.models import AuthorizedUser
from aitrading.sftp.transaction_scraper import get_transactions as get_db_transactions
from aitrading.views import get_group, HttpResponseNotFound, HttpResponse


@login_required
def transactions(request):
    try:
        group = get_group(request.user.email)
        transaction_list = get_db_transactions(group.get('group_account'))

        if DEBUG != 'True':
            keen.add_event('transaction_visits', {'group': group.get('group_account'), 'email': request.user.email})

        return render(request, 'transactions/transactions.html', {'title': 'AI Trading - Transactions',
                                    'transactions': transaction_list})
    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)


@login_required
def download_transactions(request):
    try:
        group = get_group(request.user.email)
        transaction_list = get_db_transactions(group.get('group_account'))

        if len(transaction_list) == 0:
            return HttpResponseNotFound('No transactions available')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="%s_Transactions_as_of_%s.csv"' % (group.get('group_account'), datetime.datetime.now().strftime('%Y-%m-%d'))

        header = [*transaction_list[0]._index][1:] # Get all column names (except for 'id')

        writer = csv.DictWriter(response, header, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(transaction_list)

        if DEBUG != 'True':
            keen.add_event('download_transactions', {'group': group.get('group_account'), 'email': request.user.email})

        return response

    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)
