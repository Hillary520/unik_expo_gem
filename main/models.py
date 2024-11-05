from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class Topic(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Questionnaire(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField()
    questions_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Interview(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='interviews')
    name = models.CharField(max_length=200)
    description = models.TextField()
    questions_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class QuestionnaireSubmission(models.Model):
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='submissions')
    answers = models.JSONField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    respondent_name = models.CharField(max_length=200, blank=True)
    
    def __str__(self):
        return f"Submission for {self.questionnaire.name} at {self.submitted_at}"

class InterviewSubmission(models.Model):
    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name='submissions')
    answers = models.JSONField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    respondent_name = models.CharField(max_length=200, blank=True)
    
    def __str__(self):
        return f"Submission for {self.interview.name} at {self.submitted_at}"

class QuestionAnalysis(models.Model):
    question_index = models.IntegerField()
    questionnaire = models.ForeignKey(Questionnaire, null=True, on_delete=models.CASCADE)
    interview = models.ForeignKey(Interview, null=True, on_delete=models.CASCADE)
    analysis_text = models.TextField()
    last_analyzed_submission = models.ForeignKey(
        'QuestionnaireSubmission',
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            ('question_index', 'questionnaire'),
            ('question_index', 'interview')
        ]


class OverallAnalysis(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    analysis_text = models.TextField()
    last_analyzed_submission_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['content_type', 'object_id']

class InterviewAnalysis(models.Model):
    question_index = models.IntegerField()
    interview = models.ForeignKey('Interview', on_delete=models.CASCADE)
    analysis_text = models.TextField()
    last_analyzed_submission = models.ForeignKey(
        'InterviewSubmission',
        on_delete=models.SET_NULL,
        null=True,
        related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['question_index', 'interview']
        verbose_name_plural = 'Interview Analyses'

    def __str__(self):
        return f"Analysis for Q{self.question_index+1} - {self.interview.name}"
