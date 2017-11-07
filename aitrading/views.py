import json
import re
import keen

from django.contrib.auth.decorators import login_required
from django.core.mail import EmailMessage
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest, JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string
from markupsafe import Markup

from aitrading.models import AuthorizedUser
from django.contrib.auth.models import User
from aitrading.morningstar_crawler import find_by_isin, find_by_ticker
from aitrading.sftp import portfolio_scraper

from registration.backends.hmac.views import RegistrationView


def get_group(email):
    group_account = AuthorizedUser.objects.get(email=email).account
    group_number = int(group_account[6:8])

    member_emails = AuthorizedUser.objects.filter(account=group_account).values_list('email', flat=True)
    members = User.objects.filter(email__in=member_emails)

    supervisor = User.objects.get(groups__name='supervisor')

    return {'supervisor': supervisor, 'group_number': group_number, 'group_account': group_account, 'members': members}


@login_required
def trade(request):
    try:
        group = get_group(request.user.email)
        keen.add_event("visits", {'group': group.get('group_account'), 'email': request.user.email})

        return render(request, 'trade/trade.html',
                      {'title': 'AI Trading - %s %s' % (request.user.first_name, request.user.last_name),
                       'group': group})

    except AuthorizedUser.DoesNotExist:
        return render(request, 'trade/unauthorized.html', {'title': 'AI Trading - Unauthorized'}, status=401)

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


def no_script(request):
    redir = request.GET.get('redirect', '/')

    # Prevent erroneous redirects
    if redir[0] != '/':
        redir = '/'

    return render(request, 'trade/noscript.html',
                  {'title': 'AI Trading - No Javascript',
                   'redirect': Markup('window.location.replace("%s");' % redir)})


@login_required
def security_search(request, method):
    keen.add_event("security_searches", {'email':request.user.email, 'method': method,
                                         'isin': request.GET.get('isin'), 'ticker': request.GET.get('ticker'),
                                         'currency': request.GET.get('currency')})
    if method == 'isin':
        return JsonResponse(find_by_isin(request.GET.get('isin'), request.GET.get('currency')))
    elif method == 'ticker':
        return JsonResponse(find_by_ticker(request.GET.get('ticker'), request.GET.get('currency')))
    else:
        return HttpResponseNotFound('<h1>Cannot search by "%s"</h1>' % method)


def check_authorized_email(request):
    email = request.POST.get('email')
    if email is None or len(email) == 0:
        return HttpResponseBadRequest('No email provided')
    else:
        if User.objects.filter(email=email).count() > 0:
            return HttpResponseBadRequest('An account with this email address already exists')

        try:
            return HttpResponse(AuthorizedUser.objects.get(email=email).account)
        except AuthorizedUser.DoesNotExist:
            return HttpResponseNotFound('This address has not been authorized to use AI Trading.' +
                                        ' Please contact the supervisor to request access.')


# Overrides default inactive user creator in registration.backends.hmac.views.RegistrationView
def create_inactive_user(self, form):
    new_user = form.save(commit=False)
    new_user.first_name = re.sub(r'[^a-zàâçéèêëîïôûùüÿñæœ \'-]/gi', '', form.data.get('first_name'))
    new_user.last_name = re.sub(r'[^a-zàâçéèêëîïôûùüÿñæœ \'-]/gi', '', form.data.get('last_name'))
    new_user.is_active = False
    new_user.save()

    self.send_activation_email(new_user)

    return new_user


RegistrationView.create_inactive_user = create_inactive_user
