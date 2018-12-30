import re

from django.contrib.auth.models import User
from django.http import HttpResponseBadRequest, HttpResponse, HttpResponseNotFound

from registration.backends.hmac.views import RegistrationView

from aitrading.models import AuthorizedUser


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
                                        ' Please contact the supervisors to request access.')


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
