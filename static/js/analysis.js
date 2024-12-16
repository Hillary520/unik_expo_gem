document.addEventListener('DOMContentLoaded', function() {
    const charts = {};
    let currentQuestionIndex = 0;
    const itemId = document.getElementById('itemID').value;
    const itemType = document.getElementById('itemType').value;
    const totalQns = document.getElementById('totalQns').value;
    const DELAY_BETWEEN_REQUESTS = 8000;

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function loadAnalysis() {
        const totalQuestions = totalQns;
        const statusDiv = document.getElementById('analysisStatus');

        while (currentQuestionIndex < totalQuestions) {
            try {
                const card = document.getElementById(`question${currentQuestionIndex}`);
                const loadingIndicator = card.querySelector('.loading-indicator');
                loadingIndicator.classList.remove('d-none');

                statusDiv.innerHTML = `Analyzing question ${currentQuestionIndex + 1} of ${totalQuestions}...
                    <div class="spinner-border spinner-border-sm ms-2"></div>`;

                const response = await fetch(`/${itemType}/${itemId}/analysis/${currentQuestionIndex}/`);
                const data = await response.json();

                if (data.chartData) {
                    if (data.chartData.type === 'text-analysis') {
                        // Handle text analysis visualization
                        const chartContainer = document.getElementById(`chart${currentQuestionIndex}`).parentElement;
                        chartContainer.innerHTML = ''; // Clear existing content

                        // Word frequency chart
                        const wordFreqDiv = document.createElement('div');
                        wordFreqDiv.className = 'mb-4';
                        const wordFreqCanvas = document.createElement('canvas');
                        wordFreqDiv.appendChild(wordFreqCanvas);
                        chartContainer.appendChild(wordFreqDiv);
                        new Chart(wordFreqCanvas, data.chartData.data.wordFrequency);

                        // Response length chart
                        const lengthDiv = document.createElement('div');
                        lengthDiv.className = 'mb-4';
                        const lengthCanvas = document.createElement('canvas');
                        lengthDiv.appendChild(lengthCanvas);
                        chartContainer.appendChild(lengthDiv);
                        new Chart(lengthCanvas, data.chartData.data.responseLengths);

                        // Stats display
                        const stats = document.createElement('div');
                        stats.className = 'mt-3 text-muted';
                        stats.innerHTML = `
                            <small>
                                Average response length: ${data.chartData.data.stats.averageLength.toFixed(1)} words<br>
                                Total responses: ${data.chartData.data.stats.totalResponses}<br>
                                Unique words: ${data.chartData.data.stats.uniqueWords}
                            </small>
                        `;
                        chartContainer.appendChild(stats);
                    } else {
                        // Handle regular charts (pie, bar)
                        const canvas = document.getElementById(`chart${currentQuestionIndex}`);
                        if (canvas) {
                            charts[currentQuestionIndex] = new Chart(canvas, data.chartData);
                        }
                    }
                }

                const analysisDiv = card.querySelector('.analysis-text');
                if (analysisDiv) {
                    analysisDiv.innerHTML = marked.parse(data.analysis);
                }

                loadingIndicator.classList.add('d-none');
                currentQuestionIndex++;

                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

            } catch (error) {
                console.error('Analysis loading failed:', error);
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
            }
        }

        // Load overall analysis
        try {
            statusDiv.innerHTML = `Generating overall analysis...
                <div class="spinner-border spinner-border-sm ms-2"></div>`;

            const response = await fetch(`/${itemType}/${itemId}/analysis/overall/`);
            const data = await response.json();

            const overallDiv = document.querySelector('#overallAnalysis .analysis-text');
            overallDiv.innerHTML = marked.parse(data.analysis);

            statusDiv.className = 'alert alert-success mb-4';
            statusDiv.innerHTML = 'Analysis complete!';

        } catch (error) {
            console.error('Overall analysis failed:', error);
            statusDiv.className = 'alert alert-warning mb-4';
            statusDiv.innerHTML = 'Analysis complete with some errors';
        }
    }

    document.addEventListener('DOMContentLoaded', loadAnalysis);


    async function exportPDF() {
        try {
            // Show loading
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'position-fixed top-50 start-50 translate-middle p-3 bg-white rounded shadow';
            loadingDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border text-primary me-2"></div>
                    <span>Generating PDF...</span>
                </div>
            `;
            document.body.appendChild(loadingDiv);

            const {jsPDF} = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 40;
            let yOffset = margin;

            // Add header to each page
            const addHeader = (pageNum) => {
                doc.setFontSize(10);
                doc.setTextColor(128);
                doc.text(`Page ${pageNum}`, pageWidth - margin - 40, 30);
            };

            // Add first page header
            addHeader(1);
            let pageNum = 1;

            // Title
            doc.setFontSize(24);
            doc.setTextColor(44, 62, 80); // Dark blue
            doc.text('{{ item.name }}', margin, yOffset);
            yOffset += 30;

            // Subtitle
            doc.setFontSize(16);
            doc.setTextColor(52, 73, 94); // Slightly lighter blue
            doc.text('Analysis Report', margin, yOffset);
            yOffset += 30;

            // Date
            doc.setFontSize(12);
            doc.setTextColor(127, 140, 141); // Gray
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yOffset);
            yOffset += 40;

            // Process each question
            for (const [index, chart] of Object.entries(charts)) {
                const questionEl = document.getElementById(`question${index}`);
                const questionText = questionEl.querySelector('.card-header h5').textContent;

                // Check if new page needed
                if (yOffset > pageHeight - 100) {
                    doc.addPage();
                    pageNum++;
                    addHeader(pageNum);
                    yOffset = margin;
                }

                // Question text
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                const questionLines = doc.splitTextToSize(questionText, pageWidth - (margin * 2));
                doc.text(questionLines, margin, yOffset);
                yOffset += (questionLines.length * 20) + 20;

                // Chart with proper sizing and positioning
                if (chart) {
                    const chartImage = chart.toBase64Image();
                    const imgWidth = pageWidth * 0.7; // 70% of page width
                    const imgHeight = imgWidth * 0.5; // Aspect ratio 2:1

                    // Check if chart needs new page
                    if (yOffset + imgHeight > pageHeight - margin) {
                        doc.addPage();
                        pageNum++;
                        addHeader(pageNum);
                        yOffset = margin;
                    }

                    const xOffset = (pageWidth - imgWidth) / 2; // Center chart
                    doc.addImage(chartImage, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
                    yOffset += imgHeight + 20;
                }

                // Analysis text with markdown
                const analysisMarkdown = questionEl.querySelector('.analysis-text').innerHTML;
                const analysisText = marked.parse(analysisMarkdown).replace(/<[^>]*>/g, '');
                doc.setFontSize(12);
                doc.setTextColor(52, 73, 94);
                const splitText = doc.splitTextToSize(analysisText, pageWidth - (margin * 2));

                // Check if analysis needs new page
                if (yOffset + (splitText.length * 15) > pageHeight - margin) {
                    doc.addPage();
                    pageNum++;
                    addHeader(pageNum);
                    yOffset = margin;
                }

                doc.text(splitText, margin, yOffset);
                yOffset += (splitText.length * 15) + 30;

                // Add separator
                if (index < Object.keys(charts).length - 1) {
                    doc.setDrawColor(189, 195, 199);
                    doc.line(margin, yOffset - 15, pageWidth - margin, yOffset - 15);
                    yOffset += 20;
                }
            }

            // Save PDF
            doc.save(`${itemType}_analysis_${new Date().toISOString().slice(0, 10)}.pdf`);

        } catch (error) {
            console.error('PDF export failed:', error);
            alert(`Failed to export PDF: ${error.message}`);
        } finally {
            document.querySelector('.position-fixed')?.remove();
        }
    }
})
