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
            submissionSection = `
                <h3>Your Selection</h3>
                <p>Prompt ${String(data.submission.value).toUpperCase()}</p>
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
