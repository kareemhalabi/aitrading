"""aitrading URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url, include
from django.contrib import admin

from . import views

urlpatterns = [
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^accounts/register/$', views.RegistrationView.as_view()),
    url(r'^accounts/', include('registration.backends.hmac.urls')),
    url(r'^accounts/check_authorized_email/', views.check_authorized_email, name='check_authorization'),
    url(r'^admin/', admin.site.urls),
    url(r'^$', views.trade, name='trade'),
    url(r'^portfolio/$', views.portfolio, name='portfolio'),
    url(r'^portfolio/get_snapshots/$', views.get_snapshots, name='get_snapshots'),
    url(r'^noscript/$', views.no_script, name='no_script'),
    url(r'^get_portfolio/$', views.get_portfolio, name='get_portfolio'),
    url(r'^search_by_(?P<method>[a-z]+)/$', views.security_search, name='security_search'),
    url(r'^submit_order/', views.submit_order, name='order_submission')
]
