import json

import keen
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.mail import EmailMessage
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string

from aitrading.models import AuthorizedUser
from aitrading.morningstar_crawler import find_by_isin, find_by_ticker
from aitrading.settings import DEBUG
from aitrading.sftp import portfolio_scraper
from aitrading.views import get_group


@login_required
def trade(request):
    try:
        group = get_group(request.user.email)
        if DEBUG != 'True':
            keen.add_event("visits", {'group': group.get('group_account'), 'email': request.user.email})

        return render(request, 'trade/trade.html',
                      {'title': 'AI Trading - Trade',
                       'group': group})

    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)

    except User.MultipleObjectsReturned:
        return HttpResponse('Error: More than one trading supervisor exists. '
                            'Please remove supervisor status from all but one user using the admin page.', status=500)


@login_required
def get_portfolio(request):
    group = get_group(request.user.email)
    portfolio = portfolio_scraper.get_portfolio(group.get('group_account'))
    if portfolio is None:
        return HttpResponseNotFound('No data available on server')

    return JsonResponse(portfolio)


@login_required
def submit_order(request):
    json_request = json.loads(request.body)
    trades = json_request.get('trades')
    cash = json_request.get('cash')
    notes = json_request.get('notes')

    if trades is None or cash is None:
        return HttpResponseBadRequest('Error: missing trade information')

    group = get_group(request.user.email)

    if DEBUG != 'True':
        keen.add_events({'trades':trades, 'orders':[{'group':group.get('group_account'), 'email':request.user.email}]})

    try:
        sender = '%s %s <%s>' % (request.user.first_name, request.user.last_name, request.user.email)
        other_members = group.get('members').exclude(email=request.user.email)
        other_members_emails = []

        content = render_to_string('trade/email_template.html', {'trades': trades, 'cash': cash, 'notes': notes,
                                                                 'group_account': group.get('group_account'),
                                                                 'group_number': group.get('group_number')}, request)

        for member in other_members:
            other_members_emails.append(
                '%s %s <%s>' % (member.first_name, member.last_name, member.email))

        msg = EmailMessage(
            from_email=sender,
            to=['%s %s <%s>' % (group.get('supervisor').first_name, group.get('supervisor').last_name,
                                group.get('supervisor').email)],
            bcc=[sender],
            cc=other_members_emails,
            subject='Applied Investments Trade Request - Group %s (%s)' % (
                group.get('group_number'), group.get('group_account')),
            body=str(content)
        )
        msg.content_subtype = 'html'
        msg.send()
        return JsonResponse(data={})

    except Exception as e:
        return HttpResponse('Error: ' + str(e), status=500)


@login_required
def security_search(request, method):
    if DEBUG != 'True':
        keen.add_event("security_searches", {'email':request.user.email, 'method': method,
                                         'isin': request.GET.get('isin'), 'ticker': request.GET.get('ticker'),
                                         'currency': request.GET.get('currency')})
    if method == 'isin':
        return JsonResponse(find_by_isin(request.GET.get('isin'), request.GET.get('currency')))
    elif method == 'ticker':
        return JsonResponse(find_by_ticker(request.GET.get('ticker'), request.GET.get('currency')))
    else:
        return HttpResponseNotFound('<h1>Cannot search by "%s"</h1>' % method)
