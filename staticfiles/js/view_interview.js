class SpeechToTextHandler {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentButton = null;
        this.currentTextarea = null;

        this.initializeSpeechRecognition();
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += this.capitalize(transcript);
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript && this.currentTextarea) {
                    const currentValue = this.currentTextarea.value;
                    const cursorPosition = this.currentTextarea.selectionStart;

                    // Insert text at cursor position
                    this.currentTextarea.value =
                        currentValue.substring(0, cursorPosition) +
                        finalTranscript + ' ' +
                        currentValue.substring(cursorPosition);

                    // Move cursor to end of inserted text
                    this.currentTextarea.selectionStart =
                        this.currentTextarea.selectionEnd =
                            cursorPosition + finalTranscript.length + 1;
                }
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition.start();
                } else {
                    this.stopListening();
                }
            };
        }
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    startListening(button, targetId) {
        if (!this.recognition) return;

        if (this.isListening && this.currentButton) {
            this.stopListening();
        }

        this.currentButton = button;
        this.currentTextarea = document.querySelector(`[name="${targetId}"]`);
        this.isListening = true;

        button.classList.add('listening');
        this.recognition.start();
    }

    stopListening() {
        if (!this.recognition) return;

        this.isListening = false;
        if (this.currentButton) {
            this.currentButton.classList.remove('listening');
        }
        this.recognition.stop();

        this.currentButton = null;
        this.currentTextarea = null;
    }
}

// Initialize speech-to-text handler
const speechHandler = new SpeechToTextHandler();

// Add click handlers to all mic buttons
document.querySelectorAll('.mic-button').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.dataset.target;
        if (speechHandler.isListening && speechHandler.currentButton === this) {
            speechHandler.stopListening();
        } else {
            speechHandler.startListening(this, targetId);
        }
    });
});

document.getElementById('interviewForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    speechHandler.stopListening();

    const formData = new FormData(this);
    const interviewId = this.getAttribute('data-id');
    console.log(interviewId);
    const answers = {};
    formData.forEach((value, key) => {
        answers[key] = value;
    });

    console.log(answers);

    try {
        const response = await fetch(`/interview/${interviewId}/submit/`, {
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
            window.location.href = `/interview/${interviewId}/submissions/`;
        }

    } catch (error) {
        alert('Error submitting form: ' + error.message);
    }
});

async function exportPDF() {
    const itemId = document.getElementById('interviewForm').dataset.id;

    try {
        window.location.href = `/interview/${itemId}/export-pdf/`;
    } catch (error) {
        alert('Error exporting PDF: ' + error.message);
    }
}

async function shareItem() {
    const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    shareModal.show();

    const itemId = document.getElementById('interviewForm').dataset.id;
    const shareUrl = `${window.location.origin}/interview/${itemId}/`;
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
