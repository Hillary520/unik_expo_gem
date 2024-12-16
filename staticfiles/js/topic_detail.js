let isSubmitting = false;

document.getElementById('questionnaireForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const submitBtn = document.getElementById('generateBtn');
    const spinner = document.getElementById('generatingSpinner');
    const modal = document.getElementById('createQuestionnaireModal');

    submitBtn.disabled = true;
    spinner.classList.remove('d-none');

    try {
        const formData = new FormData(this);
        const response = await fetch("{% url 'create_questionnaire' topic.id %}", {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': '{{ csrf_token }}',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Generation failed');

        // Hide modal and refresh page to show new questionnaire
        bootstrap.Modal.getInstance(modal).hide();
        window.location.href = `/questionnaire/${data.id}/`;

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});

document.querySelector('[name="question_count"]').addEventListener('change', function(e) {
    const customDiv = document.getElementById('customQuestionCount');
    const customInput = document.querySelector('[name="custom_count"]');

    if (e.target.value === 'custom') {
        customDiv.classList.remove('d-none');
        customInput.required = true;
    } else {
        customDiv.classList.add('d-none');
        customInput.required = false;
    }
});


document.getElementById('interviewForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const submitBtn = document.getElementById('generateInterviewBtn');
    const spinner = document.getElementById('interviewSpinner');
    const modal = document.getElementById('createInterviewModal');

    submitBtn.disabled = true;
    spinner.classList.remove('d-none');

    try {
        const formData = new FormData(this);
        const response = await fetch("{% url 'create_interview' topic.id %}", {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': '{{ csrf_token }}',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Generation failed');

        bootstrap.Modal.getInstance(modal).hide();
        window.location.href = `/interview/${data.id}/`;

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});

// Handle custom question count for interview
document.querySelector('#interviewForm [name="question_count"]').addEventListener('change', function(e) {
    const customDiv = document.getElementById('customInterviewCount');
    const customInput = document.querySelector('#interviewForm [name="custom_count"]');

    if (e.target.value === 'custom') {
        customDiv.classList.remove('d-none');
        customInput.required = true;
    } else {
        customDiv.classList.add('d-none');
        customInput.required = false;
    }
});

function confirmDelete(type, id) {
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    confirmBtn.onclick = () => {
        fetch(`/${type}/${id}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            }
        })
            .then(response => {
                if(response.ok) {
                    window.location.reload();
                }
            });
        modal.hide();
    };

    modal.show();
}

function deleteQuestionnaire(id) {
    confirmDelete('questionnaire', id);
}

function deleteInterview(id) {
    confirmDelete('interview', id);
}