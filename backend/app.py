from flask import Flask, request, jsonify
import pandas as pd
import json
import requests
import os

app = Flask(__name__)

# Make sure to set this before running: export OPENROUTER_API_KEY="your-key-here"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def classify_question(question: str) -> str:
    q = question.lower()
    if any(k in q for k in ["type", "structure", "missing", "null", "dtype"]):
        return "profiler"
    elif any(k in q for k in ["correlation", "distribution", "pattern", "outlier", "trend", "insight", "mean", "variance", "summary"]):
        return "insight"
    elif any(k in q for k in ["chart", "plot", "graph", "visualize", "bar", "line", "histogram", "scatter"]):
        return "chart"
    else:
        return "insight"

def query_openrouter(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://yourapp.com",
        "X-Title": "AutoAnalystX",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mistralai/mistral-7b-instruct",
        "messages": [{"role": "user", "content": prompt}],
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)

    if response.status_code != 200:
        return f"Error from OpenRouter: {response.text}"

    return response.json()['choices'][0]['message']['content']

@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    question = data.get("question")
    data_sample_json = data.get("data_sample")

    if not question or not data_sample_json:
        return jsonify({"error": "Missing question or data_sample"}), 400

    try:
        df_sample = pd.read_json(json.dumps(data_sample_json), orient="split")
    except Exception as e:
        return jsonify({"error": f"Failed to parse data_sample: {str(e)}"}), 500

    agent_type = classify_question(question)
    csv_preview = df_sample.head(30).to_string()

    if agent_type == "profiler":
        prompt = f"""You are a data profiler.
Given the dataset below, provide a structural summary, data types, missing values, and any type-related comments.

Data:
{csv_preview}
"""
    elif agent_type == "insight":
        prompt = f"""You are a data analyst.
Analyze the dataset below and extract interesting insights, statistics, or distributions based on this user question:

User Question:
{question}

Data:
{csv_preview}
"""
    elif agent_type == "chart":
        prompt = f"""You are a Python data visualization expert.
Given the following data and user request, write a Python snippet using matplotlib/seaborn/plotly to generate the desired chart.

User Question:
{question}

Data (first 30 rows):
{csv_preview}

Only return Python code wrapped in triple backticks.
"""
    else:
        return jsonify({"error": "Unrecognized question type."}), 400

    response = query_openrouter(prompt)
    return response

if __name__ == '__main__':
    app.run(debug=True)
