import csv
import datetime
import keen

from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from aitrading.settings import DEBUG
from aitrading.models import AuthorizedUser
from aitrading.sftp.transaction_scraper import get_transactions as get_db_transactions
from aitrading.views import get_group, HttpResponseNotFound, HttpResponse, HttpResponseForbidden


@login_required
def transactions(request):
    try:
        # Get group and check if user is authorized to access the group
        group = get_group(request)
        if isinstance(group, HttpResponseForbidden):
            return group
        transaction_list = get_db_transactions(group.get('group_account'))

        if DEBUG != 'True':
            keen.add_event('transaction_visits', {'group': group.get('group_account'), 'email': request.user.email})

        # Check if user is a supervisor
        if request.user.groups.filter(name='supervisor').exists():

            # Collect all viewable groups
            preview_groups = AuthorizedUser.objects.order_by('account').values_list('account', flat=True).distinct()
            # Collect the specific preview request (if available)
            preview_group = request.GET.get('preview-group')

            if preview_group:
                return render(request, 'transactions/transactions.html',
                              {'title': 'AI Trading - Transactions - Preview Group',
                               'group': group,
                               'preview_groups': preview_groups,
                               'transactions': transaction_list})

            # When first loading the page, no preview group has been selected yet
            else:
                return render(request, 'preview_landing.html',
                              {'title': 'AI Trading - Preview Group',
                               'preview_groups': preview_groups})

        # Render for regular user
        return render(request, 'transactions/transactions.html', {'title': 'AI Trading - Transactions',
                                    'transactions': transaction_list})
    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)


@login_required
def download_transactions(request):
    try:
        group = get_group(request)
        if isinstance(group, HttpResponseForbidden):
            return group
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
