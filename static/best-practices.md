## Prompting Techniques

* **Be specific:** The more specific you are with your prompts, the better the results will be.
* **Provide context:** Give the LLM context about the task you want it to perform.
* **Use examples:** Provide examples of the output you expect.
* **Ask before proceeding:** If the task has ambiguity, instruct the LLM to ask clarifying questions first.
* **Iterate and refine:** Treat prompting as a conversation—adjust and improve your instructions based on results.

### Examples
- ❌ *"Summarize this document."*
  ✅ *"Summarize this document in 3 bullet points for an executive audience, focusing on risks and next steps."*

- ❌ *"Write some SQL for sales data."*
  ✅ *"Write a SQL query in PostgreSQL to count unique customers who purchased in the last 30 days, grouped by region."*

---

## Asking Questions & Gathering Feedback

* **Ask clarifying questions:** When a task is open-ended, start by confirming assumptions.
* **Seek feedback loops:** Prompt the LLM to check if the response meets expectations before finalizing.
  Example: *"Draft an outline for a training session. Then, ask me if the level of detail matches what I need before expanding into slides."*
* **Reflect back requirements:** Instruct the model to restate the problem before solving, to catch misunderstandings early.

---

## Common Pitfalls

* **Vague prompts:** Vague prompts will lead to vague or irrelevant results.
* **Assuming knowledge:** Don't assume the LLM knows everything. Provide the necessary information.
* **Not iterating:** Don't be afraid to iterate on your prompts to get the desired output.
* **Overloading prompts:** Too much at once can overwhelm the model—break down complex tasks into steps.
* **Ignoring audience/tone:** Always specify the intended reader or tone (executive, casual, technical, persuasive).

---

## Quick Checklist

Before sending a prompt, ask yourself:
1. Am I clear about the **task** and **audience**?
2. Have I provided **context** and any **constraints** (format, tone, length)?
3. Do I want the model to **ask clarifying questions** before proceeding?
4. Should I provide **examples** of the expected output?
5. Did I plan for **iteration and feedback** if the first draft isn’t perfect?
