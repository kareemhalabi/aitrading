from django.contrib import admin

from .models import AuthorizedUser


@admin.register(AuthorizedUser)
class AuthorizedUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'account')
    list_filter = ('account',)
