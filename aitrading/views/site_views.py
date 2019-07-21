from django.contrib.auth.models import User
from django.http import HttpResponseForbidden
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


def get_group(request):

    if request.GET.get('preview-group'):
        if request.user.groups.filter(name='supervisor').exists():
            group_account = request.GET.get('preview-group')

        else:
            return HttpResponseForbidden("Only supervisors can preview other groups")
    else:
        group_account = AuthorizedUser.objects.get(email=request.user.email).account

    group_number = int(group_account[6:8])

    member_emails = AuthorizedUser.objects.filter(account=group_account).values_list('email', flat=True)
    members = User.objects.filter(email__in=member_emails)

    supervisors = User.objects.filter(groups__name='supervisor')

    return {'supervisors': supervisors, 'group_number': group_number, 'group_account': group_account, 'members': members}
