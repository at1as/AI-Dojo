document.addEventListener('DOMContentLoaded', () => {
    // --- Render Markdown in Description ---
    const converter = new showdown.Converter();
    const descriptionElement = document.querySelector('.task-description');
    if (descriptionElement) {
        const markdown = descriptionElement.textContent;
        const html = converter.makeHtml(markdown);
        descriptionElement.innerHTML = html;
    }
    const promptA = document.getElementById('prompt-a');
    const promptB = document.getElementById('prompt-b');
    const completeBtn = document.getElementById('complete-btn');
    const gradingResult = document.getElementById('grading-result');
    const gradingInProgress = document.getElementById('grading-in-progress');

    let selectedPrompt = null;

    // Check for existing grade on page load
    try {
        const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
        if (grades[taskId] && grades[taskId].score !== undefined && grades[taskId].feedback) {
            displayGrading(grades[taskId], false); // retains saved submission if present
        } else if (grades[taskId]) {
            // Clean up malformed entries
            delete grades[taskId];
            localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
        }

        // (removed) defer read-only prompt text injection until after we render the grading section
    } catch (_) {
        localStorage.removeItem('ai-dojo-grades');
    }

    promptA.addEventListener('click', () => selectPrompt('a'));
    promptB.addEventListener('click', () => selectPrompt('b'));
    completeBtn.addEventListener('click', handleSubmit);

    function selectPrompt(prompt) {
        selectedPrompt = prompt;
        promptA.classList.remove('selected');
        promptB.classList.remove('selected');

        if (prompt === 'a') {
            promptA.classList.add('selected');
        } else {
            promptB.classList.add('selected');
        }

        completeBtn.disabled = false;
    }

    function handleSubmit() {
        if (!selectedPrompt) return;

        // Hide the main UI and show the grading indicator
        if (document.querySelector('main')) document.querySelector('main').style.display = 'none';
        if (gradingInProgress) gradingInProgress.style.display = 'block';

        // Simulate a delay for grading
        setTimeout(() => {
            const isCorrect = selectedPrompt === correctAnswer;
            const score = isCorrect ? 5 : 1;
            const feedback = isCorrect ? `Correct! ${explanation}` : `Incorrect. ${explanation}`;

            if (gradingInProgress) gradingInProgress.style.display = 'none';
            // Include the user's selection with the saved grade
            displayGrading({ score, feedback, submission: { type: 'select-prompt', value: selectedPrompt } }, true);
        }, 500); // 0.5 second delay
    }

    function displayGrading(data, saveGrade = true) {
        // Validate minimal structure
        if (!data || data.score === undefined || !data.feedback) {
            return;
        }

        if (saveGrade) {
            const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
            grades[taskId] = { score: data.score, feedback: data.feedback, submission: data.submission || null };
            localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
        }

        // Build optional submission rendering
        let submissionSection = '';
        if (data.submission && data.submission.type === 'select-prompt') {
            const chosen = String(data.submission.value || '').toLowerCase();
            const aSelected = chosen === 'a' ? 'selected' : '';
            const bSelected = chosen === 'b' ? 'selected' : '';
            submissionSection = `
                <h3>Your Selection</h3>
                <div class="prompt-selection-container readonly">
                    <div class="prompt-tile ${aSelected}">
                        <h3>Prompt A</h3>
                        <p id="ro-prompt-a-text"></p>
                    </div>
                    <div class="prompt-tile ${bSelected}">
                        <h3>Prompt B</h3>
                        <p id="ro-prompt-b-text"></p>
                    </div>
                </div>
            `;
        }

        gradingResult.innerHTML = `
            <h2>Grading Complete</h2>
            <p><strong>Score:</strong> ${data.score}/5</p>
            <p><strong>Feedback:</strong> ${data.feedback}</p>
            ${submissionSection}
            <div class="task-actions">
                <button id="retry-btn" class="secondary-btn">Retry Task</button>
            </div>
        `;

        gradingResult.style.display = 'block';
        if (document.querySelector('main')) document.querySelector('main').style.display = 'none';

        // If we rendered read-only prompt tiles, fill them with the actual prompt text
        if (data.submission && data.submission.type === 'select-prompt') {
            try {
                const meta = document.getElementById('prompt-texts');
                const aText = meta ? meta.getAttribute('data-a') : '';
                const bText = meta ? meta.getAttribute('data-b') : '';
                const aEl = document.getElementById('ro-prompt-a-text');
                const bEl = document.getElementById('ro-prompt-b-text');
                if (aEl) aEl.textContent = aText || '';
                if (bEl) bEl.textContent = bText || '';
            } catch (_) {
                // no-op
            }
        }

        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
                delete grades[taskId];
                localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
                window.location.reload();
            });
        }
    }
});
