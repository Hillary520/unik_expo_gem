# main/templatetags/pdf_filters.py
from django import template
import base64
from io import BytesIO

register = template.Library()

@register.filter
def get_question(questions_data, index):
    try:
        return questions_data[index]
    except (IndexError, TypeError):
        return None

@register.filter
def get_chart_data(charts_data, index):
    try:
        return charts_data[index]
    except (IndexError, TypeError):
        return None

@register.filter
def chart_to_base64(chart_data):
    if not chart_data:
        return ''
    try:
        # Convert chart data to base64 image
        # This will be handled by Chart.js on frontend
        return chart_data
    except Exception:
        return ''