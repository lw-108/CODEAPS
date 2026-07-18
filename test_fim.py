import requests
import json

def test_fim():
    # Attempt to use FIM with DeepSeek-Coder
    prompt = "<｜fjps｜>def hello():\n    <｜fjsq｜>\n    return 'world'<｜fjlz｜>"
    url = "http://127.0.0.1:11434/api/generate"
    payload = {
        "model": "deepseek-coder:1.3b", # Target model
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_predict": 20,
            "stop": ["<｜fjsq｜>", "<｜fjlz｜>", "<｜fjps｜>", "\n\n"]
        }
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_status == 200:
            print("Response:", response.json().get("response"))
        else:
            print("Status:", response.status_code, response.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_fim()
