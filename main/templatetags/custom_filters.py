# main/templatetags/custom_filters.py
from django import template

register = template.Library()

@register.filter
def get_answer(answers, question_index):
    return answers.get(f'q_{question_index + 1}', '')


@register.filter
def multiply(value, arg):
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return None