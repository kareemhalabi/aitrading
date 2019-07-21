import json

import keen
from django.contrib.auth.decorators import login_required
from django.core.mail import EmailMessage
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest, JsonResponse, HttpResponseForbidden
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
        # Check if user is a supervisor
        if request.user.groups.filter(name='supervisor').exists():

            # Collect all viewable groups
            preview_groups = AuthorizedUser.objects.order_by('account').values_list('account', flat=True).distinct()
            # Collect the specific preview request (if available)
            preview_group = request.GET.get('preview-group')

            if preview_group:
                group = get_group(request)

                return render(request, 'trade/trade.html',
                              {'title': 'AI Trading - Trade - Preview Group',
                               'group': group,
                               'preview_groups': preview_groups})

            # When first loading the page, no preview group has been selected yet
            else:
                return render(request, 'preview_landing.html',
                              {'title': 'AI Trading - Preview Group',
                               'preview_groups': preview_groups})

        else:
            group = get_group(request)
            if isinstance(group, HttpResponseForbidden):
                return group
            if DEBUG != 'True':
                keen.add_event('visits', {'group': group.get('group_account'), 'email': request.user.email})

            return render(request, 'trade/trade.html',
                          {'title': 'AI Trading - Trade',
                           'group': group})

    except AuthorizedUser.DoesNotExist:
        return render(request, 'unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)


@login_required
def get_portfolio(request):
    group = get_group(request)
    if isinstance(group, HttpResponseForbidden):
        return group
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

    group = get_group(request)
    if isinstance(group, HttpResponseForbidden):
        return group

    if DEBUG != 'True':
        keen.add_events({'trades':trades, 'orders':[{'group':group.get('group_account'), 'email':request.user.email}]})

    try:
        sender = '%s %s <%s>' % (request.user.first_name, request.user.last_name, request.user.email)
        other_members = group.get('members').exclude(email=request.user.email)
        other_members_emails = ['%s %s <%s>' % (member.first_name, member.last_name, member.email) for member in other_members]

        supervisors = ['%s %s <%s>' % (supervisor.first_name, supervisor.last_name,
                                       supervisor.email) for supervisor in group.get('supervisors')]

        content = render_to_string('trade/email_template.html', {'trades': trades, 'cash': cash, 'notes': notes,
                                                                 'group_account': group.get('group_account'),
                                                                 'group_number': group.get('group_number')}, request)

        from aitrading.templatetags.template_tags import remove_extra_0
        msg = EmailMessage(
            from_email=sender,
            to=supervisors,
            bcc=[sender],
            cc=other_members_emails,
            subject='Applied Investments Trade Request - Group %s (%s)' % (
                group.get('group_number'), remove_extra_0(group.get('group_account'))),
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
        keen.add_event('security_searches', {'email':request.user.email, 'method': method,
                                         'isin': request.GET.get('isin'), 'ticker': request.GET.get('ticker'),
                                         'currency': request.GET.get('currency')})
    if method == 'isin':
        return JsonResponse(find_by_isin(request.GET.get('isin'), request.GET.get('currency')))
    elif method == 'ticker':
        return JsonResponse(find_by_ticker(request.GET.get('ticker'), request.GET.get('currency')))
    else:
        return HttpResponseNotFound('<h1>Cannot search by "%s"</h1>' % method)
