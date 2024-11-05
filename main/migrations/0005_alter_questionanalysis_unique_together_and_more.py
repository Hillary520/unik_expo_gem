# Generated by Django 5.1.2 on 2024-11-04 13:36

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('main', '0004_overallanalysis_questionanalysis'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='questionanalysis',
            unique_together={('question_index', 'questionnaire')},
        ),
        migrations.AddField(
            model_name='questionanalysis',
            name='interview',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='main.interview'),
        ),
        migrations.AlterField(
            model_name='questionanalysis',
            name='last_analyzed_submission',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='main.questionnairesubmission'),
        ),
        migrations.AlterField(
            model_name='questionanalysis',
            name='questionnaire',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='main.questionnaire'),
        ),
        migrations.AlterUniqueTogether(
            name='overallanalysis',
            unique_together={('content_type', 'object_id')},
        ),
        migrations.AlterUniqueTogether(
            name='questionanalysis',
            unique_together={('question_index', 'interview'), ('question_index', 'questionnaire')},
        ),
        migrations.CreateModel(
            name='InterviewAnalysis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_index', models.IntegerField()),
                ('analysis_text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('interview', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='main.interview')),
                ('last_analyzed_submission', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='main.interviewsubmission')),
            ],
            options={
                'verbose_name_plural': 'Interview Analyses',
                'unique_together': {('question_index', 'interview')},
            },
        ),
    ]
