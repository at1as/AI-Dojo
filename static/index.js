document.addEventListener('DOMContentLoaded', () => {
    const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
    const taskItems = document.querySelectorAll('.task-item');
    const statusFilter = document.getElementById('status-filter');
    const statusBtn = statusFilter.querySelector('.multiselect-btn');
    const statusOptions = statusFilter.querySelector('.multiselect-options');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const tagFilter = document.getElementById('tag-filter');

    const difficultyBtn = difficultyFilter.querySelector('.multiselect-btn');
    const difficultyOptions = difficultyFilter.querySelector('.multiselect-options');
    const tagBtn = tagFilter.querySelector('.multiselect-btn');
    const tagOptions = tagFilter.querySelector('.multiselect-options');
    const solvedCounter = document.getElementById('solved-counter');
    const viewReportBtn = document.getElementById('view-report-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const reportCardModal = document.getElementById('report-card-modal');
    const reportCardContent = document.getElementById('report-card-content');
    const exportFromModalBtn = document.getElementById('export-from-modal-btn');
    const closeModalBtn = reportCardModal.querySelector('.close-btn');
    const bestPracticesBtn = document.getElementById('best-practices-btn');
    const bestPracticesModal = document.getElementById('best-practices-modal');
    const bestPracticesContent = document.getElementById('best-practices-content');
    const closeBestPracticesBtn = bestPracticesModal.querySelector('.close-btn');
    const noResultsMessage = document.getElementById('no-results-message');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    loadAndApplyFilters();

    // --- Render Markdown in Descriptions ---
    const converter = new showdown.Converter();
    document.querySelectorAll('.task-description').forEach(desc => {
        const markdown = desc.textContent;
        const html = converter.makeHtml(markdown);
        desc.innerHTML = html;
    });

    // --- Populate Grades, Filters, and Counters ---
    let solvedCount = 0;
    const allTags = new Set();
    taskItems.forEach(item => {
        const scoreDisplay = item.querySelector('.score-display');
        const taskId = scoreDisplay.dataset.taskId;
        if (grades[taskId]) {
            scoreDisplay.textContent = `Score: ${grades[taskId].score}/5`;
            solvedCount++;
        } else {
            scoreDisplay.textContent = 'Not Attempted';
            scoreDisplay.style.backgroundColor = '#e9ecef';
            scoreDisplay.style.color = '#6c757d';
        }

        const tags = item.dataset.tags.split(',');
        tags.forEach(tag => { if (tag) allTags.add(tag.trim()); });
    });

    // Update solved counter
    solvedCounter.textContent = `🏆 ${solvedCount} / ${taskItems.length} Tasks Solved`;

    // Populate tag filter dropdown
    Array.from(allTags).sort().forEach(tag => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${tag}`));
        tagOptions.appendChild(label);
    });

    // --- Event Listeners ---
    statusOptions.addEventListener('change', filterTasks);
    difficultyOptions.addEventListener('change', filterTasks);
    tagOptions.addEventListener('change', filterTasks);

    difficultyBtn.addEventListener('click', () => {
        difficultyOptions.style.display = difficultyOptions.style.display === 'none' ? 'block' : 'none';
    });

    tagBtn.addEventListener('click', () => {
        tagOptions.style.display = tagOptions.style.display === 'none' ? 'block' : 'none';
    });

    statusBtn.addEventListener('click', () => {
        statusOptions.style.display = statusOptions.style.display === 'none' ? 'block' : 'none';
    });

    window.addEventListener('click', (e) => {
        // Close multiselect dropdowns if click is outside
        if (!difficultyFilter.contains(e.target)) {
            difficultyOptions.style.display = 'none';
        }
        if (!tagFilter.contains(e.target)) {
            tagOptions.style.display = 'none';
        }
        if (!statusFilter.contains(e.target)) {
            statusOptions.style.display = 'none';
        }

        // Close modals if click is on the background
        if (e.target == reportCardModal) {
            reportCardModal.style.display = 'none';
        }
        if (e.target == bestPracticesModal) {
            bestPracticesModal.style.display = 'none';
        }
    });

    clearFiltersBtn.addEventListener('click', () => {
        statusOptions.querySelectorAll('input:checked').forEach(input => input.checked = false);
        difficultyOptions.querySelectorAll('input:checked').forEach(input => input.checked = false);
        tagOptions.querySelectorAll('input:checked').forEach(input => input.checked = false);
        filterTasks();
    });
    viewReportBtn.addEventListener('click', handleViewReport);
    clearCacheBtn.addEventListener('click', handleClearCache);
    exportFromModalBtn.addEventListener('click', handleExportReport);
    closeModalBtn.addEventListener('click', () => reportCardModal.style.display = 'none');
    bestPracticesBtn.addEventListener('click', handleBestPractices);
    closeBestPracticesBtn.addEventListener('click', () => bestPracticesModal.style.display = 'none');


    // --- Filter Logic ---
    function filterTasks() {
        const selectedStatuses = [...statusOptions.querySelectorAll('input:checked')].map(input => input.value);
        const selectedDifficulties = [...difficultyOptions.querySelectorAll('input:checked')].map(input => input.value);
        const selectedTags = [...tagOptions.querySelectorAll('input:checked')].map(input => input.value);

        const filters = {
            statuses: selectedStatuses,
            difficulties: selectedDifficulties,
            tags: selectedTags
        };
        localStorage.setItem('ai-dojo-filters', JSON.stringify(filters));
        updateFilterButtons();
        checkClearButtonState();

        let visibleCount = 0;

        taskItems.forEach(item => {
            const taskId = item.querySelector('.score-display').dataset.taskId;
            const isSolved = grades[taskId] !== undefined;
            const itemDifficulty = item.dataset.difficulty.toLowerCase();
            const itemTags = item.dataset.tags.split(',').map(t => t.trim());

            const statusMatch = selectedStatuses.length === 0 || selectedStatuses.some(status => status === 'solved' ? isSolved : !isSolved);
            const difficultyMatch = selectedDifficulties.length === 0 || selectedDifficulties.includes(itemDifficulty);
            const tagMatch = selectedTags.length === 0 || itemTags.some(tag => selectedTags.includes(tag));

            if (statusMatch && difficultyMatch && tagMatch) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        noResultsMessage.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    function generateReportContent(format = 'markdown') {
        if (format === 'csv') {
            let csv = 'Task Title,Status,Score\n';
            taskItems.forEach(item => {
                const title = item.querySelector('h2').textContent.replace(/ Score: \d+\/5| Not Attempted/, '');
                const taskId = item.querySelector('.score-display').dataset.taskId;
                const grade = grades[taskId];
                
                if (grade) {
                    csv += `"${title}",Solved,${grade.score}/5\n`;
                } else {
                    csv += `"${title}",Not Attempted,N/A\n`;
                }
            });
            return csv;
        } else {
            let content = `# AI Literacy Dojo - Report Card\n\n`;
            content += `**Total Solved:** ${solvedCount} / ${taskItems.length}\n\n---\n\n`;
    
            taskItems.forEach(item => {
                const title = item.querySelector('h2').textContent.replace(/ Score: \d+\/5| Not Attempted/, '');
                const taskId = item.querySelector('.score-display').dataset.taskId;
                const grade = grades[taskId];
    
                content += `## ${title}\n`;
                if (grade) {
                    content += `**Status:** Solved\n`;
                    content += `**Score:** ${grade.score}/5\n`;
                    if (grade.feedback) {
                        content += `**Feedback:** ${grade.feedback}\n\n`;
                    }
                } else {
                    content += `**Status:** Not Attempted\n\n`;
                }
            });
            return content;
        }
    }

    function handleViewReport() {
        const reportContent = generateReportContent('markdown');
        const converter = new showdown.Converter();
        const html = converter.makeHtml(reportContent);
        reportCardContent.innerHTML = html;
        reportCardModal.style.display = 'flex';
    }

    function checkClearButtonState() {
        const anyFilterSelected = statusOptions.querySelector('input:checked') || difficultyOptions.querySelector('input:checked') || tagOptions.querySelector('input:checked');
        clearFiltersBtn.disabled = !anyFilterSelected;
    }

    function handleExportReport() {
        const reportContent = generateReportContent('csv');
        const blob = new Blob([reportContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-dojo-report-card.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleClearCache() {
        if (confirm('Are you sure you want to clear all your progress? This action cannot be undone.')) {
            localStorage.removeItem('ai-dojo-grades');
            location.reload();
        }
    }

    function handleBestPractices() {
        fetch('/static/best-practices.md')
            .then(response => response.text())
            .then(text => {
                const converter = new showdown.Converter();
                const html = converter.makeHtml(text);
                bestPracticesContent.innerHTML = html;
                bestPracticesModal.style.display = 'flex';
            })
            .catch(error => {
                console.error('Error fetching best practices:', error);
                bestPracticesContent.innerHTML = '<p>Could not load content.</p>';
                bestPracticesModal.style.display = 'flex';
            });
    }

    function loadAndApplyFilters() {
        const savedFilters = JSON.parse(localStorage.getItem('ai-dojo-filters'));
        if (!savedFilters) return;

        if (Array.isArray(savedFilters.statuses)) {
            savedFilters.statuses.forEach(status => {
                const checkbox = statusOptions.querySelector(`input[value="${status}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (Array.isArray(savedFilters.difficulties)) {
            savedFilters.difficulties.forEach(difficulty => {
                const checkbox = difficultyOptions.querySelector(`input[value="${difficulty}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        if (Array.isArray(savedFilters.tags)) {
            savedFilters.tags.forEach(tag => {
                const checkbox = tagOptions.querySelector(`input[value="${tag}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        filterTasks();
    }

    function updateFilterButtons() {
        updateFilterButtonText(statusFilter, 'Status');
        updateFilterButtonText(difficultyFilter, 'Difficulty');
        updateFilterButtonText(tagFilter, 'Tags');
    }

    function updateFilterButtonText(filterElement, name) {
        const btn = filterElement.querySelector('.multiselect-btn');
        const options = filterElement.querySelector('.multiselect-options');
        const selectedCount = options.querySelectorAll('input:checked').length;
        const totalCount = options.querySelectorAll('input').length;

        if (selectedCount > 0) {
            btn.textContent = `${name} (${selectedCount}/${totalCount})`;
        } else {
            btn.textContent = name;
        }
    }
});
