from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import render
from markupsafe import Markup

from aitrading.morningstar_crawler import find_by_isin, find_by_ticker

@login_required
def trade(request):
    return render(request, 'trade.html')


def no_script(request):
    redir = request.GET.get('redirect', '/')

    # Prevent erroneous redirects
    if redir[0] != '/':
        redir = '/'

    return render(request, 'noscript.html',
                  {'redirect': Markup('window.location.replace("%s");' % redir)})

@login_required
def security_search(request, method):
    if method == 'isin':
        return JsonResponse(find_by_isin(request.GET.get('isin'), request.GET.get('currency')))
    elif method == 'ticker':
        return JsonResponse(find_by_ticker(request.GET.get('ticker'), request.GET.get('currency')))
    else:
        return HttpResponseNotFound('<h1>Cannot search by "%s"</h1>' % method)
