# agents.py
import pandas as pd
from llm_utils import call_mistral

def profiler_agent(data_sample: pd.DataFrame, question: str) -> str:
    csv_text = data_sample.to_csv(index=False)
    prompt = f"""
You are a data profiling assistant.

Given the following CSV sample:

{csv_text}

Answer the question:
{question}

Focus on structure, column types, and missing values. Be concise.
"""
    return call_mistral(prompt)

def insight_agent(data_sample: pd.DataFrame, question: str) -> str:
    csv_text = data_sample.to_csv(index=False)
    prompt = f"""
You are a data insight assistant.

Given the CSV sample:

{csv_text}

Answer the following analytical question:
{question}

Look for distributions, trends, correlations, or anomalies.
Include summary stats or visual intuition where needed.
"""
    return call_mistral(prompt)

def chart_agent(data_sample: pd.DataFrame, question: str) -> str:
    csv_text = data_sample.to_csv(index=False)
    prompt = f"""
You are a data visualization agent.

Here is a CSV sample:

{csv_text}

Given this, answer the question:
{question}

Suggest charts or return Python code using matplotlib or seaborn to visualize the answer.
"""
    return call_mistral(prompt)
