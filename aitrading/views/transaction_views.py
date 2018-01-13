from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from aitrading.models import AuthorizedUser
from aitrading.views import get_group, HttpResponseNotFound, JsonResponse
from aitrading.sftp.transaction_scraper import get_transactions as get_db_transactions


@login_required
def transactions(request):
    try:
        group = get_group(request.user.email)
        transaction_list = get_db_transactions(group.get('group_account'))
        return render(request, 'transactions/transactions.html', {'title': 'AI Trading - Transactions',
                                    'transactions': transaction_list})
    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)
