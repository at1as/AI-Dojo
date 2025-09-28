import os
import yaml
import json
import sqlite3
import pandas as pd
from flask import Flask, render_template, request, jsonify
from openai import OpenAI, AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configure the OpenAI client
azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
if azure_endpoint:
    client = AzureOpenAI(
        azure_endpoint=azure_endpoint,
        api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
    )
    # The model name in Azure is the deployment name
    model_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
else:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    model_name = "gpt-4o-mini"

def load_tasks():
    with open('tasks.yaml', 'r') as f:
        all_tasks = yaml.safe_load(f)
    
    # Filter for visible tasks and create a dictionary by id
    visible_tasks = {task['id']: task for task in all_tasks if task.get('visible', False)}
    return visible_tasks

tasks = load_tasks()

@app.route('/')
def index():
    return render_template('index.html', tasks=tasks)

@app.route('/task/<task_id>')
def task(task_id):
    task = tasks.get(task_id)
    if not task:
        return "Task not found", 404

    if task.get('grading') == 'select-prompt':
        return render_template('select_prompt.html', task=task, task_id=task_id)
    else:
        return render_template('task.html', task=task, task_id=task_id)

@app.route('/api/chat/<task_id>', methods=['POST'])
def chat(task_id):
    data = request.json
    conversation = data.get('conversation', [])
    
    current_task = tasks.get(task_id)
    system_message_content = "You are a helpful assistant. Guide the user to solve the task."

    # Add a specialized system prompt for SQL auto-grading tasks
    if current_task and current_task.get('grading') == 'sql':
        system_message_content = (
            "You are an expert SQL assistant. Your sole purpose is to help the user write a single, correct SQL query to solve the given problem. "
            "The user will provide their final query in a markdown code block. Do not provide solutions in other languages like Python or pandas. "
            "Guide the user toward the correct SQL syntax and logic."
        )

    system_message = {"role": "system", "content": system_message_content}
    messages = [system_message] + conversation

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=500
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



def grade_yaml_spec(user_spec, task):
    """Grades a YAML spec by attempting to parse it."""
    if not user_spec:
        return {'score': 1, 'feedback': 'No YAML spec was submitted.'}

    try:
        yaml.safe_load(user_spec)
        # You could add more sophisticated validation here, e.g., against an OpenAPI schema
        return {'score': 5, 'feedback': 'Correct! Your submission is valid YAML.'}
    except yaml.YAMLError as e:
        return {'score': 1, 'feedback': f'Your submission is not valid YAML: {e}'}
    except Exception as e:
        return {'score': 1, 'feedback': f'An unexpected error occurred during grading: {e}'}

def grade_sql_query(user_query, task):
    """Grades a SQL query by executing it and comparing the output."""
    if not user_query:
        return {'score': 1, 'feedback': 'No SQL query was submitted.'}

    conn = sqlite3.connect(':memory:')
    try:
        for file in task['files']:
            df = pd.read_csv(f"static/{file}")
            table_name = file.split('/')[-1].replace('.csv', '')
            df.to_sql(table_name, conn, index=False, if_exists='replace')

        user_df = pd.read_sql_query(user_query, conn)

        # Basic validation: Check if the returned data has the expected columns
        expected_df = pd.DataFrame(task['expected_output'])
        if list(user_df.columns) != list(expected_df.columns):
            return {'score': 2, 'feedback': f"Your query returned the wrong columns. Expected: {list(expected_df.columns)}, Got: {list(user_df.columns)}"}

        # Sort both dataframes to ensure comparison is order-independent
        user_df_sorted = user_df.sort_values(by=list(user_df.columns)).reset_index(drop=True)
        expected_df_sorted = expected_df.sort_values(by=list(expected_df.columns)).reset_index(drop=True)

        if user_df_sorted.equals(expected_df_sorted):
            return {'score': 5, 'feedback': 'Correct! Your query produced the exact expected output.'}
        else:
            return {'score': 3, 'feedback': 'Your query ran, but the output did not match the expected result. Check your logic.'}
    except pd.io.sql.DatabaseError as e:
        return {'score': 1, 'feedback': f'Your SQL query is invalid and could not be executed. Error: {e}'}
    except Exception as e:
        return {'score': 1, 'feedback': f'An unexpected error occurred during grading: {e}'}
    finally:
        conn.close()

@app.route('/api/grade/<task_id>', methods=['POST'])
def grade(task_id):
    data = request.json
    conversation = data.get('conversation', [])
    current_task = tasks.get(task_id)

    if not current_task:
        return jsonify({'error': 'Task not found'}), 404

    final_score = 1
    llm_feedback_prompt = ''

    if current_task.get('grading') == 'sql':
        user_query = data.get('query')
        auto_grade_result = grade_sql_query(user_query, current_task)
        final_score = auto_grade_result['score']
        
        llm_feedback_prompt = f"""The user has submitted a SQL query for the following task:
**Task:** {current_task['title']}
**Description:** {current_task['description']}

An auto-grader has already checked their query for correctness. Here is the result:
**Auto-Grader Result:** {auto_grade_result['feedback']}

Now, please provide qualitative feedback on the user's conversation and problem-solving process. Use paragraphs to structure your feedback.
- Did they ask good questions to understand the problem?
- Did they iterate effectively if they got stuck?
- Was their final query well-structured, even if it was incorrect?

Combine the auto-grader's result with your qualitative feedback into a single, helpful message. Start by confirming the auto-grader's finding, then provide your analysis of their process."""
    elif current_task.get('grading') == 'yaml':
        user_spec = data.get('spec')
        auto_grade_result = grade_yaml_spec(user_spec, current_task)
        final_score = auto_grade_result['score']
        
        llm_feedback_prompt = f"""The user has submitted a YAML spec for the following task:
**Task:** {current_task['title']}
**Description:** {current_task['description']}

An auto-grader has already checked their spec for correctness. Here is the result:
**Auto-Grader Result:** {auto_grade_result['feedback']}

Now, please provide qualitative feedback on the user's conversation and problem-solving process. Use paragraphs to structure your feedback.
- Did they ask good questions to understand the problem?
- Did they iterate effectively if they got stuck?
- Was their final spec well-structured, even if it was incorrect?

Combine the auto-grader's result with your qualitative feedback into a single, helpful message. Start by confirming the auto-grader's finding, then provide your analysis of their process."""
    else:
        llm_feedback_prompt = f"""You are a grading assistant. Your goal is to provide helpful, constructive feedback on the user's problem-solving process. Evaluate the entire conversation based on the provided task and rubric. Use paragraphs to structure your feedback.

**Critique the user's process, not just the final answer.**
- Did the user write clear and effective prompts?
- Did they iterate and refine their approach?
- How well did they guide the AI to the solution?
- Was their final answer correct and well-explained?

**Task:** {current_task['title']}
**Description:** {current_task['description']}
**Rubric:** {current_task['rubric']}"""

    conversation_transcript = "\n\n**Conversation Transcript:**\n"
    for message in conversation:
        conversation_transcript += f"{message['role'].capitalize()}: {message['content']}\n"

    full_prompt = llm_feedback_prompt + conversation_transcript + "\n**Instructions:**\nProvide your feedback as a single string. Do not wrap it in a JSON object."

    # Try to get qualitative feedback from the LLM, but always return a valid response
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful teaching assistant providing qualitative feedback."},
                {"role": "user", "content": full_prompt}
            ]
        )
        qualitative_feedback = response.choices[0].message.content
    except Exception:
        # Fall back to auto-grader feedback for SQL/YAML tasks, or a generic message otherwise
        if current_task.get('grading') in ('sql', 'yaml'):
            qualitative_feedback = auto_grade_result['feedback']
        else:
            qualitative_feedback = (
                "We couldn't generate qualitative feedback at this time. "
                "Your task was graded; please try again later for detailed feedback."
            )

    # For non auto-graded tasks, provide a default score
    if current_task.get('grading') not in ('sql', 'yaml'):
        final_score = 4

    return jsonify({'score': final_score, 'feedback': qualitative_feedback})

@app.route('/api/file/<path:filepath>')
def get_file_content(filepath):
    # Security: Basic check to ensure files are read from the static directory
    safe_path = os.path.normpath(os.path.join(app.static_folder, filepath))
    if not safe_path.startswith(app.static_folder):
        return jsonify({'error': 'Access denied'}), 403

    try:
        with open(safe_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'content': content})
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Ensure the specs directory exists
    if not os.path.exists('static/specs'):
        os.makedirs('static/specs')
    app.run(debug=True, port=5001)


