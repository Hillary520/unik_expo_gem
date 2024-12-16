window.jsPDF = window.jspdf.jsPDF;

document.addEventListener('DOMContentLoaded', function() {
    loadAnalysis();
});

marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    sanitize: false
});

async function loadAnalysis() {
    const spinner = document.getElementById('loadingSpinner');
    const resultsDiv = document.getElementById('analysisResults');

    try {
        spinner.style.display = 'block';

        const response = await fetch(window.location.href, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        resultsDiv.innerHTML = marked.parse(data.analysis);

        // Add classes to tables for Bootstrap styling
        resultsDiv.querySelectorAll('table').forEach(table => {
            table.classList.add('table', 'table-striped', 'table-bordered');
        });
    } catch (error) {
        console.error('Failed to load analysis:', error);
        resultsDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to load analysis. Please try again.
                </div>
            `;
    } finally {
        spinner.style.display = 'none';
    }
}

// Update PDF export function
async function exportToPDF(itemType) {
    try {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'position-fixed top-50 start-50 translate-middle';
        loadingDiv.innerHTML = `
                <div class="bg-white p-4 rounded-3 shadow-lg text-center">
                    <div class="spinner-border text-primary mb-3"></div>
                    <p class="mb-0">Generating PDF...</p>
                </div>
            `;
        document.body.appendChild(loadingDiv);

        // Clone the element to avoid modifying the original
        const element = document.getElementById('analysisResults');
        // set element background to white
        element.style.background = 'white';
        const clone = element.cloneNode(true);

        // Create temporary container with white background
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.background = 'white';
        container.style.width = element.offsetWidth + 'px';
        container.appendChild(clone);
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
            scale: 2, // Higher quality
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, (imgHeight * pageWidth) / imgWidth);
        heightLeft -= pageHeight;

        // Additional pages if needed
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, (imgHeight * pageWidth) / imgWidth);
            heightLeft -= pageHeight;
            page++;
        }

        pdf.save(`${itemType}_analysis_${new Date().toISOString().slice(0,10)}.pdf`);

        // Cleanup
        container.remove();
        loadingDiv.remove();
        element.style.background = 'rgb(254, 240, 215)';

    } catch (error) {
        console.error('PDF export failed:', error);
        alert(`Failed to export PDF: ${error.message}`);
    } finally {
        document.querySelector('.position-fixed')?.remove();
        loadingDiv.remove();
    }
}