document.addEventListener('DOMContentLoaded', () => {
    // --- Render Markdown in Description ---
    const converter = new showdown.Converter();
    const descriptionElement = document.querySelector('.task-description');
    if (descriptionElement) {
        const markdown = descriptionElement.textContent;
        const html = converter.makeHtml(markdown);
        descriptionElement.innerHTML = html;
    }
    // Chat elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatBox = document.getElementById('chat-box');
    const completeBtn = document.getElementById('complete-btn');
    const gradingResult = document.getElementById('grading-result');
    const gradingInProgress = document.getElementById('grading-in-progress');

    // Modal elements
    const modal = document.getElementById('file-modal');
    const modalFilename = document.getElementById('modal-filename');
    const modalFileContent = document.getElementById('modal-file-content');
    const closeBtn = document.querySelector('.close-btn');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalCopyChatBtn = document.getElementById('modal-copy-chat-btn');

    // SQL Submission Modal elements
    const sqlModal = document.getElementById('sql-modal');
    const sqlSubmissionInput = document.getElementById('sql-submission-input');
    const cancelSqlSubmissionBtn = document.getElementById('cancel-sql-submission');
    const submitSqlQueryBtn = document.getElementById('submit-sql-query');

    // YAML Submission Modal elements
    const yamlModal = document.getElementById('yaml-modal');
    const yamlSubmissionInput = document.getElementById('yaml-submission-input');
    const cancelYamlSubmissionBtn = document.getElementById('cancel-yaml-submission');
    const submitYamlSpecBtn = document.getElementById('submit-yaml-spec');
    const exportChatBtn = document.getElementById('export-chat-btn');

    // File action buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const copyChatButtons = document.querySelectorAll('.copy-chat-btn');

    let conversationHistory = [];

    // Check for existing grade on page load
    try {
        const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
        console.log('Checking grades for task:', taskId, grades[taskId]);
        
        if (grades[taskId] && grades[taskId].score !== undefined && grades[taskId].feedback) {
            console.log('Valid grade found, displaying grading result');
            displayGrading(grades[taskId], false); // Don't re-save the grade
        } else if (grades[taskId]) {
            console.log('Invalid grade data found, clearing:', grades[taskId]);
            // Clear invalid grade data
            delete grades[taskId];
            localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
        }
    } catch (error) {
        console.error('Error parsing grades from localStorage:', error);
        // Clear corrupted localStorage data
        localStorage.removeItem('ai-dojo-grades');
    }

    // --- Event Listeners ---

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleChatSubmit();
        });
    }

    if (userInput) {
        userInput.addEventListener('keydown', handleKeydown);
        userInput.addEventListener('input', autoGrowTextarea);
    }

    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            // Check if the current task is a SQL grading task
            if (isSqlTask) {
                sqlModal.style.display = 'flex';
            } else if (isYamlTask) {
                yamlModal.style.display = 'flex';
            } else {
                handleCompleteTask();
            }
        });
    }

    if (cancelSqlSubmissionBtn) {
        cancelSqlSubmissionBtn.addEventListener('click', () => sqlModal.style.display = 'none');
    }

    if (submitSqlQueryBtn) {
        submitSqlQueryBtn.addEventListener('click', () => {
            const userQuery = sqlSubmissionInput.value;
            handleCompleteTask({ query: userQuery });
            sqlModal.style.display = 'none';
        });
    }

    if (cancelYamlSubmissionBtn) {
        cancelYamlSubmissionBtn.addEventListener('click', () => yamlModal.style.display = 'none');
    }

    if (submitYamlSpecBtn) {
        submitYamlSpecBtn.addEventListener('click', () => {
            const userSpec = yamlSubmissionInput.value;
            handleCompleteTask({ spec: userSpec });
            yamlModal.style.display = 'none';
        });
    }

    viewButtons.forEach(button => {
        button.addEventListener('click', () => handleFileAction(button.dataset.filepath, 'view'));
    });

    copyButtons.forEach(button => {
        button.addEventListener('click', () => handleFileAction(button.dataset.filepath, 'copy', button));
    });

    copyChatButtons.forEach(button => {
        button.addEventListener('click', () => handleFileAction(button.dataset.filepath, 'copy-chat', button));
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }

    if (modalCopyChatBtn) {
        modalCopyChatBtn.addEventListener('click', () => {
            const content = modalFileContent.textContent;
            userInput.value += `\n\n---\n${content}`;
            autoGrowTextarea(); // Adjust textarea size
            modal.style.display = 'none';
            userInput.focus();
        });
    }

    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', handleExportChat);
    }

    if (modalCopyBtn) {
        modalCopyBtn.addEventListener('click', () => {
            const content = modalFileContent.textContent;
            navigator.clipboard.writeText(content).then(() => {
                const originalText = modalCopyBtn.textContent;
                modalCopyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    modalCopyBtn.textContent = originalText;
                }, 2000);
            });
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
        if (event.target == sqlModal) {
            sqlModal.style.display = 'none';
        }
        if (event.target == yamlModal) {
            yamlModal.style.display = 'none';
        }
    });

    // --- Handlers ---

    function handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    }

    function autoGrowTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    }

    async function handleChatSubmit() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        // Reset textarea height after sending
        userInput.style.height = 'auto';

        addMessage(userMessage, 'user');
        conversationHistory.push({ role: 'user', content: userMessage });
        userInput.value = '';

        try {
            const response = await fetch(`/api/chat/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation: conversationHistory })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const assistantMessage = data.reply;

            addMessage(assistantMessage, 'assistant');
            conversationHistory.push({ role: 'assistant', content: assistantMessage });

            // Enable complete button after first exchange
            if (completeBtn.disabled) {
                completeBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error during chat:', error);
            addMessage('Sorry, something went wrong. Please try again.', 'assistant');
        }
    }

    // These are passed from the template
    const isSqlTask = taskGradingType === 'sql';
    const isYamlTask = taskGradingType === 'yaml';

    async function handleCompleteTask(submission = {}) {
        // Hide the main UI and show the grading indicator
        if (document.querySelector('main')) document.querySelector('main').style.display = 'none';
        if (gradingInProgress) gradingInProgress.style.display = 'block';

        try {
            const payload = { ...submission, conversation: conversationHistory };

            const response = await fetch(`/api/grade/${taskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (gradingInProgress) gradingInProgress.style.display = 'none';

            // Attach user's submission so we can save and display it with the grade
            const submissionSummary = submission.spec
                ? { type: 'yaml', value: submission.spec }
                : (submission.query
                    ? { type: 'sql', value: submission.query }
                    : { type: 'chat', value: conversationHistory });

            const dataWithSubmission = { ...data, submission: submissionSummary };
            displayGrading(dataWithSubmission, true);
        } catch (error) {
            console.error('Error during grading:', error);
            if (gradingInProgress) gradingInProgress.style.display = 'none';
            gradingResult.innerHTML = `<p>Error grading task. Please try again.</p>`;
            gradingResult.style.display = 'block';
        }
    }

    async function handleFileAction(filepath, action, buttonElement = null) {
        try {
            const response = await fetch(`/api/file/${filepath}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const content = data.content;

            if (action === 'view') {
                modalFilename.textContent = filepath.split('/').pop();
                modalFileContent.textContent = content;
                modal.style.display = 'flex';
            } else if (action === 'copy') {
                navigator.clipboard.writeText(content).then(() => {
                    if (buttonElement) {
                        const originalText = buttonElement.textContent;
                        buttonElement.textContent = 'Copied!';
                        setTimeout(() => {
                            buttonElement.textContent = originalText;
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                    alert('Failed to copy text.');
                });
            } else if (action === 'copy-chat') {
                userInput.value += `\n\n\`\`\`\n${content}\n\`\`\``;
                autoGrowTextarea();
                userInput.focus();
                if (buttonElement) {
                    const originalText = buttonElement.textContent;
                    buttonElement.textContent = 'Copied!';
                    setTimeout(() => {
                        buttonElement.textContent = originalText;
                    }, 2000);
                }
            }
        } catch (error) {
            console.error(`Error during file ${action}:`, error);
            alert(`Could not ${action} file. See console for details.`);
        }
    }

    function addMessage(text, sender) {
        const message = document.createElement('div');
        message.className = `message ${sender}-message`;

        const converter = new showdown.Converter();
        const html = converter.makeHtml(text);
        message.innerHTML = html;

        chatBox.appendChild(message);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function displayGrading(data, saveGrade = true) {
        // Validate grade data
        if (!data || data.score === undefined || !data.feedback) {
            console.error('Invalid grade data:', data);
            // Clear invalid grade data and reload
            const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
            delete grades[taskId];
            localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
            return;
        }

        if (saveGrade) {
            const grades = JSON.parse(localStorage.getItem('ai-dojo-grades')) || {};
            grades[taskId] = { score: data.score, feedback: data.feedback, submission: data.submission || null };
            localStorage.setItem('ai-dojo-grades', JSON.stringify(grades));
        }

        // Ensure grading result element exists
        if (!gradingResult) {
            console.error('Grading result element not found');
            return;
        }

        // Build optional submission section
        let submissionSection = '';
        if (data.submission) {
            if (data.submission.type === 'sql' || data.submission.type === 'yaml') {
                submissionSection = `
                    <h3>Your Submission</h3>
                    <pre id="user-submission"></pre>
                `;
            } else if (data.submission.type === 'select-prompt') {
                submissionSection = `
                    <h3>Your Selection</h3>
                    <p>Prompt ${String(data.submission.value).toUpperCase()}</p>
                `;
            } else if (data.submission.type === 'chat' && Array.isArray(data.submission.value)) {
                submissionSection = `
                    <h3>Your Conversation</h3>
                    <p>${data.submission.value.length} messages</p>
                `;
            }
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
        
        // Hide the main task UI
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.style.display = 'none';
        }

        // Hide grading in progress if it's showing
        if (gradingInProgress) {
            gradingInProgress.style.display = 'none';
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

        // If we rendered a user-submission pre block, fill it with the raw text safely
        if (data.submission && (data.submission.type === 'sql' || data.submission.type === 'yaml')) {
            const subEl = document.getElementById('user-submission');
            if (subEl) {
                try {
                    subEl.textContent = String(data.submission.value || '');
                } catch (_) {
                    subEl.textContent = '';
                }
            }
        }
    }

    function handleExportChat() {
        let markdownContent = `# Chat History for Task: ${document.title}\n\n`;
        conversationHistory.forEach(message => {
            const prefix = message.role === 'user' ? '**You**' : '**Assistant**';
            markdownContent += `${prefix}:\n${message.content}\n\n---\n\n`;
        });

        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${taskId}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
