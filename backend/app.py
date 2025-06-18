from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

def query_ollama(prompt: str) -> str:
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            headers={"Content-Type": "application/json"},
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False
            }
        )
        if response.status_code != 200:
            return f"Error from Ollama: {response.text}"
        return response.json().get("response", "").strip()
    except Exception as e:
        return f"Error calling Ollama: {str(e)}"

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

Given the user request and data, generate a Python code snippet that produces a **visual chart** using matplotlib/seaborn.
Be sure to include the `plt.show()` command so the plot is visible.

User Request:
{question}

Data (first 30 rows):
{csv_preview}

Respond ONLY with runnable Python code, wrapped in triple backticks. No explanations.
"""

    else:
        return jsonify({"error": "Unrecognized question type."}), 400

    response = query_ollama(prompt)
    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
