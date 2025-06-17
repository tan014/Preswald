import os
import requests

def call_mistral(prompt: str) -> str:
    """
    Sends a prompt to the Mistral LLM via the OpenRouter API and returns the response.

    Args:
        prompt (str): The input prompt to send to the LLM.

    Returns:
        str: The response from the LLM, or an error message if the request fails.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")  # Ensure this environment variable is set
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost",  # Required by OpenRouter
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mistral/mistral-7b-instruct",
        "messages": [
            {"role": "system", "content": "You are a helpful data assistant."},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"API Error: {str(e)}"