from django import template
import locale
locale.setlocale(locale.LC_ALL, '')
register = template.Library()


@register.filter
def currency(value):
    if isinstance(value, str):
        value = float(value)

    return locale.currency(value, grouping=True)