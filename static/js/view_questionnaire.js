document.getElementById('questionnaireForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const questionnaireId = this.getAttribute('data-id');
    console.log(questionnaireId);
    const answers = {};
    formData.forEach((value, key) => {
        answers[key] = value;
    });

    console.log(answers);

    try {
        const response = await fetch(`/questionnaire/${questionnaireId}/submit/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({
                answers: answers
            })
        });

        if (!response.ok) throw new Error('Submission failed');

        const data = await response.json();
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            window.location.href = `/questionnaire/${questionnaireId}/submissions/`;
        }
    } catch (error) {
        alert('Error submitting form: ' + error.message);
    }
});

async function exportPDF() {
    const itemId = document.getElementById('questionnaireForm').dataset.id;

    try {
        window.location.href = `/questionnaire/${itemId}/export-pdf/`;
    } catch (error) {
        alert('Error exporting PDF: ' + error.message);
    }
}

async function shareItem() {
    const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    shareModal.show();

    const itemId = document.getElementById('questionnaireForm').dataset.id;
    const shareUrl = `${window.location.origin}/questionnaire/${itemId}/`;
    document.getElementById('shareLink').value = shareUrl;
}

async function shareVia(platform) {
    const shareUrl = document.getElementById('shareLink').value;
    const title = document.title;

    switch(platform) {
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`);
            break;
        case 'linkedin':
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`);
            break;
        case 'email':
            window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`;
            break;
    }
}

async function copyLink() {
    const linkInput = document.getElementById('shareLink');
    await navigator.clipboard.writeText(linkInput.value);
    alert('Link copied to clipboard!');
}
