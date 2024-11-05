# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('topic/new/', views.create_topic, name='create_topic'),
    path('topic/<int:pk>/', views.topic_detail, name='topic_detail'),
    path('topic/<int:topic_id>/questionnaire/new/', views.create_questionnaire, name='create_questionnaire'),
    path('questionnaire/<int:pk>/', views.view_questionnaire, name='view_questionnaire'),
    path('topic/<int:topic_id>/interview/new/', views.create_interview, name='create_interview'),
    path('interview/<int:pk>/', views.view_interview, name='view_interview'),
    path('questionnaire/<int:pk>/submit/', views.submit_questionnaire, name='submit_questionnaire'),
    path('interview/<int:pk>/submit/', views.submit_interview, name='submit_interview'),
    path('<str:type>/<int:pk>/submissions/', views.view_submissions, name='view_submissions'),
    path('questionnaire/<int:pk>/export-pdf/', views.export_questionnaire_pdf, name='export_questionnaire_pdf'),
    path('interview/<int:pk>/export-pdf/', views.export_interview_pdf, name='export_interview_pdf'),
    path('submission-success/', views.submission_success, name='submission_success'),
    path('<str:type>/<int:pk>/export-excel/', views.export_submissions_excel, name='export_submissions_excel'),
    path('<str:type>/<int:pk>/analysis/', views.view_analysis, name='view_analysis'),
    path('<str:type>/<int:pk>/analysis/<int:question_index>/', views.get_question_analysis, name='get_question_analysis'),
    path('<str:type>/<int:pk>/analysis/overall/', views.get_overall_analysis, name='get_overall_analysis'),
    path('<str:type>/<int:pk>/analysis/', views.view_analysis, name='view_analysis_page'),
    path('topic/<int:pk>/analyse/', views.view_topic_analysis, name='view_topic_analysis'),
    path('interview/<int:pk>/delete/', views.delete_interview, name='delete_interview'),
    path('questionnaire/<int:pk>/delete/', views.delete_questionnaire, name='delete_questionnaire'),
]