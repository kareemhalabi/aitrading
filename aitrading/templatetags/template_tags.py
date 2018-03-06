from django import template
import locale
locale.setlocale(locale.LC_ALL, '')
register = template.Library()


@register.filter
def currency(value):
    if isinstance(value, str):
        value = float(value)

    if round(value, 2) == 0:
        return "$ --"

    return locale.currency(value, grouping=True)

@register.filter
def negate(value):
    return -value

# Used to remove the extra 0 in the account number when sending emails
@register.filter
def remove_extra_0(value):
    return value[:-2] + value[-1]
