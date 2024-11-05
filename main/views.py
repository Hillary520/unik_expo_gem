# main/views.py
from datetime import datetime
import json
from django.urls import reverse
import google.generativeai as genai
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from .models import OverallAnalysis, Topic, Questionnaire, Interview, QuestionnaireSubmission, InterviewSubmission, QuestionAnalysis, QuestionAnalysis, InterviewAnalysis
from django.conf import settings
import json
import logging
from django.views.decorators.http import require_http_methods
from django.template.loader import get_template
from django.core.exceptions import ValidationError
from django.http import FileResponse
from .utils import create_pdf_questionnaire, export_submissions_to_excel, generate_overall_analysis, generate_topic_analysis
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.contenttypes.models import ContentType
from django.db.models import Max
from django.http import JsonResponse
from .utils import generate_question_analysis, prepare_chart_data
from django.contrib import messages
from django.shortcuts import redirect

logger = logging.getLogger(__name__)

def home(request):
    topics = Topic.objects.filter(user=request.user)
    context = {'topics': topics}
    return render(request, 'main/home.html', context)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_questionnaire(description, question_count, include_bio=True):
    try:
        generation_config = {
            "temperature": 0.7,  # Reduced for more consistent output
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config,
        )

        # Structured prompt template
        bio_questions = """
        Include these biographical questions at the start:
        - Full Name (Input)
        - Gender (Select: Male, Female, Other, Prefer not to say)
        - Date of Birth (Input)
        - Email Address (Input)
        - Contact Number (Input)
        """ if include_bio else ""

        prompt = f"""Generate a questionnaire based on this description: '{description}'. Generate exactly {question_count} questions. {bio_questions}
        Return a JSON object with fields: name(string) for the form, description(string) of the form and a questions array where every element has 2 fields: text and the fieldType and fieldType can be of these options RadioGroup, Select, Input, Textarea, Switch; and but don't include; 'checkbox' and return it in json format. For RadioGroup, and Select types also return fieldOptions array with text and value fields. For example, for RadioGroup, and Select types, the field options array can be [text: 'Every 3 months', value: 'every 3 months', text: 'No', value: 'no'] and for Input and Textarea, the field options array can be empty. For example, for Input and Textarea, the field options array can be []. No Switchtypes"""

        # Get single response without chat session
        response = model.generate_content(prompt)
        
        if not response or not response.text:
            raise ValueError("Empty response from Gemini API")

        # Clean and parse JSON
        json_str = response.text.strip()
        if json_str.startswith('```json'):
            json_str = json_str[7:-3].strip()
        
        questionnaire_data = json.loads(json_str)
        
        # Validate structure
        required_fields = ['name', 'description', 'questions']
        if not all(field in questionnaire_data for field in required_fields):
            raise ValueError("Missing required fields in response")
            
        return questionnaire_data, None
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {str(e)}")
        return None, "Invalid JSON response format"
    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        return None, str(e)

@login_required
def create_topic(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        topic = Topic.objects.create(
            user=request.user,
            title=title,
            description=description
        )
        return redirect('topic_detail', pk=topic.pk)
    return render(request, 'main/create_topic.html')

@login_required
def topic_detail(request, pk):
    topic = get_object_or_404(Topic, pk=pk, user=request.user)
    questionnaires = Questionnaire.objects.filter(topic=topic)
    interviews = Interview.objects.filter(topic=topic)
    return render(request, 'main/topic_detail.html', {
        'topic': topic,
        'questionnaires': questionnaires,
        'interviews': interviews
    })

@login_required
@require_http_methods(["GET", "POST"])
def create_questionnaire(request, topic_id):
    topic = get_object_or_404(Topic, pk=topic_id, user=request.user)

    if request.method == 'POST':
        try:
            description = request.POST.get('description')
            include_bio = request.POST.get('include_bio') == 'on'
            
            # Get question count
            question_count = request.POST.get('question_count')
            if question_count == 'custom':
                question_count = request.POST.get('custom_count')
            question_count = int(question_count)
            
            if not 1 <= question_count <= 30:
                return JsonResponse({'error': 'Invalid question count'}, status=400)
                
            questionnaire_data, error = generate_questionnaire(
                description, 
                question_count,
                include_bio
            )
            
            if error:
                return JsonResponse({'error': error}, status=400)
                
            questionnaire = Questionnaire.objects.create(
                topic=topic,
                name=questionnaire_data['name'],
                description=questionnaire_data['description'],
                questions_data=questionnaire_data['questions']
            )
            
            return JsonResponse({
                'id': questionnaire.id,
                'success': True
            })
            
        except Exception as e:
            logger.error(f"Questionnaire creation error: {str(e)}")
            return JsonResponse({
                'error': 'Failed to create questionnaire'
            }, status=500)

def view_questionnaire(request, pk):
    questionnaire = get_object_or_404(Questionnaire, pk=pk)
    return render(request, 'main/view_questionnaire.html', {
        'questionnaire': questionnaire,
        'questionnaire_id': pk,
        'type': 'questionnaire'
    })


def generate_interview(description, question_count, include_bio=True):
    try:
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=generation_config
        )

        bio_template = """
        Include these biographical fields at the start:
        - Name (Textarea)
        - Position/Role (Textarea)
        - Organization (Textarea)
        - Years of Experience (Textarea)
        """ if include_bio else ""

        prompt = f"""Create an in-depth interview about: {description}
        Generate exactly {question_count} interview questions.
        {bio_template}
        
        Requirements:
        - Use open-ended questions
        - Focus on qualitative responses
        - Make questions conversational
        - Use mainly Textarea fields for responses
        
        Return only this JSON structure:
        {{
            "name": "title of interview",
            "description": "brief description of the interview purpose",
            "questions": [
                {{
                    "text": "question text",
                    "fieldType": "Textarea",  // Use Textarea for most questions
                    "fieldOptions": []
                }}
            ]
        }}"""

        response = model.generate_content(prompt)
        
        if not response or not response.text:
            raise ValueError("Empty response")

        json_str = response.text.strip()
        if json_str.startswith('```json'):
            json_str = json_str[7:-3].strip()
            
        return json.loads(json_str), None
        
    except Exception as e:
        logger.error(f"Interview generation error: {e}")
        return None, str(e)

@login_required
@require_http_methods(["GET", "POST"])
def create_interview(request, topic_id):
    try:        
        if request.method == 'POST':
            description = request.POST.get('description')
            if not description:
                return JsonResponse({'error': 'Description is required'}, status=400)

            include_bio = request.POST.get('include_bio') == 'on'
            
            # Handle question count
            try:
                question_count = request.POST.get('question_count')
                if question_count == 'custom':
                    question_count = int(request.POST.get('custom_count', 0))
                else:
                    question_count = int(question_count)
                
                if not 1 <= question_count <= 30:
                    raise ValueError("Question count must be between 1 and 30")
            except (TypeError, ValueError) as e:
                return JsonResponse({'error': str(e)}, status=400)

            # Generate interview questions
            interview_data, error = generate_interview(description, question_count, include_bio)
            if error:
                return JsonResponse({'error': error}, status=400)

            # Create interview
            interview = Interview.objects.create(
                topic = get_object_or_404(Topic, id=topic_id),
                name=interview_data['name'],
                description=interview_data['description'],
                questions_data=interview_data['questions']
            )

            return JsonResponse({'id': interview.id, 'success': True})
    except Exception as e:
        logger.error(f"Interview creation failed: {str(e)}")
        return JsonResponse({'error': 'Failed to create interview'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


def view_interview(request, pk):
    interview = get_object_or_404(Interview, pk=pk)
    return render(request, 'main/view_interview.html', {
        'interview': interview,
        'interview_id': pk,
        'type': 'interview'
    })




@require_http_methods(["POST"])
def submit_questionnaire(request, pk):
    questionnaire = get_object_or_404(Questionnaire, pk=pk)
    try:
        data = json.loads(request.body)
        submission = QuestionnaireSubmission.objects.create(
            questionnaire=questionnaire,
            answers=data['answers'],
            respondent_name=data.get('respondent_name', '')
        )
        if not request.user.is_authenticated:
            return JsonResponse({'redirect': reverse('submission_success')})
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@require_http_methods(["POST"])
def submit_interview(request, pk):
    interview = get_object_or_404(Interview, pk=pk)
    try:
        data = json.loads(request.body)
        submission = InterviewSubmission.objects.create(
            interview=interview,
            answers=data['answers'],
            respondent_name=data.get('respondent_name', '')
        )
        if not request.user.is_authenticated:
            return JsonResponse({'redirect': reverse('submission_success')})
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def view_submissions(request, type, pk):
    if type == 'questionnaire':
        item = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
        submissions = QuestionnaireSubmission.objects.filter(questionnaire=item)
        template = 'main/questionnaire_submissions.html'
    else:
        item = get_object_or_404(Interview, pk=pk, topic__user=request.user)
        submissions = InterviewSubmission.objects.filter(interview=item)
        template = 'main/interview_submissions.html'
        
    return render(request, template, {
        'item': item,
        'submissions': submissions,
        'submission_count': submissions.count()
    })



@login_required
def export_questionnaire_pdf(request, pk):
    questionnaire = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
    buffer = create_pdf_questionnaire(questionnaire)
    
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"{questionnaire.name}.pdf"
    )

@login_required
def export_interview_pdf(request, pk):
    interview = get_object_or_404(Interview, pk=pk, topic__user=request.user)
    buffer = create_pdf_questionnaire(interview)  # We can use same function
    
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"{interview.name}.pdf"
    )


def submission_success(request):
    return render(request, 'main/submission_success.html')

def get_share_url(request, type, pk):
    current_site = get_current_site(request)
    return f"https://{current_site.domain}/{type}/{pk}/"


@login_required
def export_submissions_excel(request, type, pk):
    if type == 'questionnaire':
        item = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
        submissions = QuestionnaireSubmission.objects.filter(questionnaire=item)
    else:
        item = get_object_or_404(Interview, pk=pk, topic__user=request.user)
        submissions = InterviewSubmission.objects.filter(interview=item)
    
    return export_submissions_to_excel(type, item, submissions)



@login_required
def get_question_analysis(request, type, pk, question_index):
    try:
        if type == 'questionnaire':
            item = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
            submissions = QuestionnaireSubmission.objects.filter(questionnaire=item)
            analysis = QuestionAnalysis.objects.filter(
                question_index=question_index,
                questionnaire=item
            ).first()
        else:
            item = get_object_or_404(Interview, pk=pk, topic__user=request.user)
            submissions = InterviewSubmission.objects.filter(interview=item)
            analysis = InterviewAnalysis.objects.filter(
                question_index=question_index,
                interview=item
            ).first()

        # Get latest submission
        latest_submission = submissions.order_by('-submitted_at').first()
        
        # Check if analysis needs update
        needs_update = (
            not analysis or 
            not analysis.last_analyzed_submission or 
            analysis.last_analyzed_submission.submitted_at < latest_submission.submitted_at
        )

        if needs_update and latest_submission:
            # Get answers for this question
            answers = [s.answers.get(f'q_{question_index+1}') for s in submissions]
            question = item.questions_data[question_index]
            
            # Generate new analysis
            analysis_text = generate_question_analysis(question, answers)
            
            if analysis:
                analysis.analysis_text = analysis_text
                analysis.last_analyzed_submission = latest_submission
                analysis.save()
            else:
                model_class = QuestionAnalysis if type == 'questionnaire' else InterviewAnalysis
                analysis = model_class.objects.create(
                    question_index=question_index,
                    **{'questionnaire': item} if type == 'questionnaire' else {'interview': item},
                    analysis_text=analysis_text,
                    last_analyzed_submission=latest_submission
                )

        return JsonResponse({
            'analysis': analysis.analysis_text if analysis else '',
            'chartData': prepare_chart_data(
                item.questions_data[question_index],
                [s.answers.get(f'q_{question_index+1}') for s in submissions]
            )
        })
        
    except Exception as e:
        logger.error(f"Question analysis error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def get_overall_analysis(request, type, pk):
    try:
        if type == 'questionnaire':
            item = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
            submissions = QuestionnaireSubmission.objects.filter(questionnaire=item)
        else:
            item = get_object_or_404(Interview, pk=pk, topic__user=request.user)
            submissions = InterviewSubmission.objects.filter(interview=item)
            
        latest_submission = submissions.order_by('-submitted_at').first()
        
        # Get or create overall analysis
        analysis = OverallAnalysis.objects.filter(
            content_type=ContentType.objects.get_for_model(item),
            object_id=item.id
        ).first()
        
        needs_update = (
            not analysis or 
            analysis.last_analyzed_submission_date < latest_submission.submitted_at
        )
        
        if needs_update and latest_submission:
            analysis_text = generate_overall_analysis(item, submissions)
            
            if analysis:
                analysis.analysis_text = analysis_text
                analysis.last_analyzed_submission_date = latest_submission.submitted_at
                analysis.save()
            else:
                analysis = OverallAnalysis.objects.create(
                    content_type=ContentType.objects.get_for_model(item),
                    object_id=item.id,
                    analysis_text=analysis_text,
                    last_analyzed_submission_date=latest_submission.submitted_at
                )
        
        return JsonResponse({
            'analysis': analysis.analysis_text if analysis else ''
        })
        
    except Exception as e:
        logger.error(f"Overall analysis error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def view_analysis(request, type, pk):
    try:
        if type == 'questionnaire':
            item = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
            submissions = QuestionnaireSubmission.objects.filter(questionnaire=item)
        else:
            item = get_object_or_404(Interview, pk=pk, topic__user=request.user)
            submissions = InterviewSubmission.objects.filter(interview=item)
        
        context = {
            'item': item,
            'type': type,
            'submission_count': submissions.count()
        }
        
        return render(request, 'main/analysis.html', context)
        
    except Exception as e:
        logger.error(f"Analysis view error: {e}")
        messages.error(request, "Unable to load analysis")
        return redirect('home')


@login_required
def view_topic_analysis(request, pk):
    try:
        topic = get_object_or_404(Topic, pk=pk, user=request.user)
        questionnaires = Questionnaire.objects.filter(topic=topic).prefetch_related('submissions')
        interviews = Interview.objects.filter(topic=topic).prefetch_related('submissions')
        total_responses = sum(q.submissions.count() for q in questionnaires) + sum(i.submissions.count() for i in interviews)
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            analysis = generate_topic_analysis(topic, questionnaires, interviews)
            return JsonResponse({'analysis': analysis})
            
        return render(request, 'main/topic_analysis.html', {
            'topic': topic,
            'questionnaire_count': questionnaires.count(),
            'interview_count': interviews.count(),
            'total_responses': total_responses
        })
        
    except Exception as e:
        logger.error(f"Topic analysis view error: {e}")
        messages.error(request, "Unable to load topic analysis")
        return redirect('home')

@login_required
def delete_interview(request, pk):
    interview = get_object_or_404(Interview, pk=pk, topic__user=request.user)
    topic_id = interview.topic.id
    
    if request.method == 'POST':
        interview.delete()
        messages.success(request, 'Interview deleted successfully')
        return redirect('topic_detail', pk=topic_id)
        
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

@login_required 
def delete_questionnaire(request, pk):
    questionnaire = get_object_or_404(Questionnaire, pk=pk, topic__user=request.user)
    topic_id = questionnaire.topic.id
    
    if request.method == 'POST':
        questionnaire.delete()
        messages.success(request, 'Questionnaire deleted successfully')
        return redirect('topic_detail', pk=topic_id)
        
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})








