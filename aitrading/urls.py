"""aitrading URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  re_path(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  re_path(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import re_path, include
    2. Add a URL to urlpatterns:  re_path(r'^blog/', include('blog.urls'))
"""
from django.urls import path, re_path, include
from django.contrib import admin

from . import views

urlpatterns = [
    path(r'accounts/', include('django.contrib.auth.urls')),
    path(r'accounts/register/', views.RegistrationView.as_view()),
    path(r'accounts/', include('django_registration.backends.activation.urls')),
    path(r'accounts/check_authorized_email/', views.check_authorized_email, name='check_authorization'),
    path(r'admin/', admin.site.urls),
    path(r'', views.trade, name='trade'),
    path(r'portfolio/', views.portfolio, name='portfolio'),
    path(r'portfolio/get_snapshots/', views.get_snapshots, name='get_snapshots'),
    path(r'portfolio/download_all', views.download_portfolio_all, name='download_all_portfolio'),
    path(r'portfolio/download_ts', views.download_portfolio_timeseries, name='download_all_timeseries'),
    path(r'noscript/', views.no_script, name='no_script'),
    path(r'get_portfolio/', views.get_portfolio, name='get_portfolio'),
    re_path(r'search_by_(?P<method>[a-z]+)/$', views.security_search, name='security_search'),
    path(r'submit_order/', views.submit_order, name='order_submission'),
    path(r'transactions/', views.transactions, name='transactions'),
    path(r'transactions/download', views.download_transactions, name='download_transactions')
]
