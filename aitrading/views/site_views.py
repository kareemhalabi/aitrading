from django.shortcuts import render
from markupsafe import Markup


def no_script(request):
    redir = request.GET.get('redirect', '/')

    # Prevent erroneous redirects
    if redir[0] != '/':
        redir = '/'

    return render(request, 'noscript.html',
                  {'title': 'AI Trading - No Javascript',
                   'redirect': Markup('window.location.replace("%s");' % redir)})