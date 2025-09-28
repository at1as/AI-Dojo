
# 🥋 AI Dojo — Spec

## 1. Context

We want to build a lightweight, open-source tool for training employees (or anyone) to use LLMs effectively for real-world tasks.

The tool provides **tasks/challenges** (e.g., “Fix this OpenAPI spec and confirm it validates” or “Write a SQL query to join two tables”). The user interacts with an AI assistant to solve the problem, and when they mark the task as complete, the system **grades their conversation**.

Over time, this grows from subjective AI-based grading to objective auto-grading (like LeetCode for AI + task literacy).

The goal:

* Make AI literacy **practical and measurable**.
* Allow **easy addition of new problems** (structured, not hardcoded).
* Start dead simple (no DB, just Flask + LLM API).

---

## 2. Milestones

### **v1**

* User selects a task from a list.
* They interact with the AI assistant to solve it.
* When done, they press **"Complete"**.
* The system sends the **conversation transcript + task definition** to an LLM to **grade**.
* Output: score (1–5), rubric-based feedback, and next steps.
* Tasks may include downloadable files (e.g., `openapi.yaml`).

### **v2**

* Support **auto-grading tasks**:

  * CSV upload with expected parsing result.
  * SQL queries executed against a small in-memory DB.
  * Code execution in a sandbox (Python-only at first).
* Hybrid grading: objective pass/fail + LLM transcript evaluation.

### **v3**

* **Add/manage tasks via structured config (YAML/JSON)**.

  * Each task defines:

    ```yaml
    id: openapi-validate
    title: "Fix this OpenAPI spec"
    description: "Download the provided spec and use AI to help validate/fix it."
    files: ["specs/broken_openapi.yaml"]
    grading: "llm" # or "sql", "csv", "code"
    rubric: "Check if the user verified with openapi-cli and explained their process."
    ```
* Ability for admins to contribute new tasks easily.

### **v4+ (Future Enhancements)**

* User accounts, authentication, progress tracking.
* Leaderboards / gamification (scores, badges).
* Analytics on common failure points (“Most users struggle with SQL joins”).
* Multi-model support (Anthropic, local LLMs).
* Enterprise mode: private tasks using company-specific data.

---

## 3. Pitfalls / Open Questions

* **Self-grading with LLMs**:

  * Bias risk (model grading itself).
  * Mitigation: fixed rubrics, multiple grader runs, ensemble grading.

* **Auto-grading correctness**:

  * SQL: many correct answers possible → need canonical result comparison, not string match.
  * Code execution: must sandbox securely (Docker, Pyodide, or external service).

* **Task authoring**:

  * Need a structured, flexible format (YAML/JSON) so tasks aren’t hardcoded in Python.
  * Pitfall: complexity creep if too many grading types.
  * Solution: start with `"llm" | "sql" | "csv"` grading modes, extend later.

* **Context handling**:

  * Do we persist conversation? Or resend the full transcript every time?
  * For v1: resend entire transcript (small scale, simple).
  * Later: maintain conversation state + store in DB.

---

## 4. Examples / Extended Context

### Example Task (v1)

```yaml
id: sql-basic
title: "Write a SQL query"
description: "Given tables `users(id, name)` and `orders(user_id, total)`, write a query to return each user with their total spend."
grading: "llm"
rubric: "Did the query join correctly, group by, and sum totals? Were edge cases considered?"
```

### Example Task (v2)

```yaml
id: csv-parse
title: "Parse CSV with CLI"
description: "Upload a CSV and transform it into JSON with AI’s help."
grading: "csv"
expected_output: "parsed/example.json"
```

### Example Interaction Flow

1. User picks “Fix OpenAPI Spec” task.
2. They download `broken_openapi.yaml`.
3. They chat with AI: “What’s wrong with this spec? How do I fix it?”
4. When satisfied, they hit **Complete**.
5. Transcript + task rubric → Grader LLM.
6. Grader responds:

   * Score: 4/5
   * Feedback: “Good job validating with openapi-cli. You missed adding a response schema to /users endpoint.”

---

## 5. Tech Stack Preference

* **Backend**: Flask (lightweight, simple routes).
* **Frontend**: Minimal (could start with plain HTML/JS or simple JS library if needed).
* **LLM**: OpenAI API (`gpt-4o-mini` for grading + conversation).
* **Data**:

  * v1: In-memory task definitions (YAML/JSON).
  * v2+: Add DB (Postgres or SQLite).
* **File handling**:

  * v1: Static files downloadable.
  * v2: Allow file upload + parsing.
* **Session handling**:

  * v1: Stateless (resend transcript each time).
  * Later: Persistent sessions + user login.

---

## 6. Roadmap Summary

1. **v1 (MVP)**: Task list → AI convo → User marks complete → LLM grades transcript.
2. **v2**: Auto-grading support for CSV, SQL, simple code execution.
3. **v3**: Structured task authoring via YAML/JSON.
4. **v4+**: User accounts, gamification, analytics, enterprise support.

---

⚡️ This is essentially **“LeetCode for AI Literacy”**, starting simple and extensible over time.

---
