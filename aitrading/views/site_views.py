from django.contrib.auth.models import User
from django.shortcuts import render
from markupsafe import Markup

from aitrading.models import AuthorizedUser


def no_script(request):
    redir = request.GET.get('redirect', '/')

    # Prevent erroneous redirects
    if redir[0] != '/':
        redir = '/'

    return render(request, 'noscript.html',
                  {'title': 'AI Trading - No Javascript',
                   'redirect': Markup('window.location.replace("%s");' % redir)})


def get_group(email):
    group_account = AuthorizedUser.objects.get(email=email).account
    group_number = int(group_account[6:8])

    member_emails = AuthorizedUser.objects.filter(account=group_account).values_list('email', flat=True)
    members = User.objects.filter(email__in=member_emails)

    supervisor = User.objects.get(groups__name='supervisor')

    return {'supervisor': supervisor, 'group_number': group_number, 'group_account': group_account, 'members': members}
