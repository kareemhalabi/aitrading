from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import render

from aitrading.models import AuthorizedUser
from aitrading.views import get_group
from aitrading.sftp.portfolio_scraper import get_snapshots as snapshots


@login_required
def portfolio(request):
    try:
        return render(request, 'portfolio/portfolio.html', {'title': 'AI Trading - Portfolio Details'})

    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)


@login_required
def get_snapshots(request):
    group = get_group(request.user.email)
    account_snapshots = snapshots(group.get('group_account'))
    if account_snapshots is None:
        return HttpResponseNotFound('No data available on server')

    return JsonResponse({"snapshots": account_snapshots})
