# AI Dojo

Practice AI literacy skills through hands-on tasks and instant feedback. This app provides small, focused exercises (prompt selection, SQL, OpenAPI/YAML, and chat-driven tasks) with auto-grading and qualitative feedback.

## Features
- Task catalog with multiple task types:
  - Select the Better Prompt (A/B prompt reasoning)
  - SQL query tasks (auto-graded with SQLite and pandas)
  - OpenAPI/YAML spec validation tasks (auto-graded parsing)
  - Chat-driven tasks with rubric-based qualitative feedback
- Grade persistence in localStorage so returning to a task shows your previous result and a Retry option
- "Your Submission" persistence (SQL/YAML/prompt selection/chat) to put grades in context
- Modern UI with chat, file preview, export chat, and modals

## Tech Stack
- Backend: Flask (Python)
- Frontend: Vanilla JS + CSS
- Data: YAML task definitions in `tasks.yaml`
- Grading:
  - SQL: executes against in-memory SQLite and compares results
  - YAML: validates/loads spec and returns structured feedback
  - Qualitative feedback: OpenAI Chat Completions (optional fallback)

## Getting Started

### 1) Prerequisites
- Python 3.9+
- pip

### 2) Install Dependencies
Create a virtualenv (recommended), then:

```bash
pip install -r requirements.txt
```

If you don't have a requirements.txt yet, install the core libs directly:

```bash
pip install flask pandas pyyaml openai
```

### 3) Environment Variables
Copy `.env.example` to `.env` and set values as needed. You can use either Azure OpenAI or OpenAI — set one or the other.

```bash
cp .env.example .env
# edit .env
```

Required for qualitative feedback (non auto-graded tasks):
- Option A: OpenAI API
  - `OPENAI_API_KEY`

- Option B: Azure OpenAI
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_ENDPOINT` (e.g., https://your-resource-name.openai.azure.com/)
  - `AZURE_OPENAI_DEPLOYMENT` (the deployment name for the Chat Completions model)

Auto-graded tasks (SQL/YAML) still work without any LLM key.

### 4) Run the App

```bash
python app.py
```

The app runs at:
- http://127.0.0.1:5001/

If you prefer Makefile shortcuts (if present):

```bash
make run
```

## Project Structure
```
ai-dojo/
├─ app.py                 # Flask app and grading routes
├─ tasks.yaml             # Task definitions (types, prompts, answers, etc.)
├─ templates/
│  ├─ index.html          # Task list and filters
│  ├─ task.html           # General chat/submit task page
│  └─ select_prompt.html  # Specialized template for A/B prompt tasks
├─ static/
│  ├─ style.css           # Global styles
│  ├─ script.js           # Task page logic (chat, YAML/SQL grading, persistence)
│  ├─ select_prompt.js    # A/B selection logic and persistence
│  └─ specs/              # Example/spec files referenced by tasks
├─ .env.example           # Example environment variables
├─ Makefile               # Optional helper commands
└─ README.md
```

## How Grading & Persistence Works
- When you submit a task, the backend returns `{ score, feedback }`.
- The frontend persists a record per task in `localStorage` under `ai-dojo-grades` with:
  - `score`: number 1–5
  - `feedback`: string
  - `submission`:
    - SQL: `{ type: 'sql', value: '<raw SQL>' }`
    - YAML: `{ type: 'yaml', value: '<raw YAML>' }`
    - Select-prompt: `{ type: 'select-prompt', value: 'a' | 'b' }`
    - Chat: `{ type: 'chat', value: [ { role, content }, ... ] }`
- Returning to a task loads your last grade and shows a "Retry Task" button to clear it and start fresh.

If grades appear stuck or malformed, you can clear them via DevTools:
- Application > Local Storage > `ai-dojo-grades` > remove the task key

## Troubleshooting
- I submitted but never saw a grade
  - Check the Network tab for the POST `/api/grade/<task_id>` response
  - It should be JSON with `score` and `feedback`
  - If using LLM feedback, confirm `OPENAI_API_KEY` is set; the backend now falls back to auto-grader feedback for SQL/YAML if the LLM call fails
- Styling/layout issues
  - Hard refresh (Cmd+Shift+R)
  - Clear cache if assets were heavily modified
- Modal issues
  - Modals use fixed positioning; ensure no CSS overrides are constraining them

## Roadmap Ideas
- Better accessibility and keyboard navigation
- Mobile responsiveness polish
- Export full transcripts and submissions as Markdown
- Server-side persistence of attempts and grades (in addition to localStorage)

## License
Add your preferred license here (e.g., MIT).
