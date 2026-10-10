import os
import json
import re
import sys
import io
import traceback
from typing import Dict, Any, List, Optional
import httpx
import pandas as pd

from .analytics_service import generate_analytics
from .insights_service import generate_insights
from ..models.dataset import Dataset
from ..config import settings

def load_dataframe(file_path: str, file_type: str) -> Optional[pd.DataFrame]:
    try:
        if file_type == 'text/csv' or file_path.endswith('.csv'):
            return pd.read_csv(file_path)
        elif file_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or file_path.endswith(('.xls', '.xlsx')):
            return pd.read_excel(file_path)
    except Exception:
        pass
    return None

def build_rich_context(dataset: Dataset, file_path: str) -> str:
    quality_report_path = f"{file_path}.quality.json"
    quality_data = {}
    if os.path.exists(quality_report_path):
        try:
            with open(quality_report_path, "r", encoding="utf-8") as f:
                quality_data = json.load(f)
        except Exception:
            pass

    analytics_data = generate_analytics(file_path, dataset.file_type)
    if not isinstance(analytics_data, dict) or "error" in analytics_data:
        analytics_data = {}

    summary = {
        "dataset_name": dataset.original_filename,
        "total_rows": quality_data.get("total_rows", dataset.row_count),
        "total_columns": quality_data.get("total_columns", dataset.column_count),
        "columns": quality_data.get("column_summary", []),
        "identified_issues": quality_data.get("identified_issues", []),
        "total_revenue": analytics_data.get("totalRevenue"),
        "total_orders": analytics_data.get("totalOrders"),
        "average_order_value": analytics_data.get("averageOrderValue"),
        "return_count": analytics_data.get("totalReturns"),
    }
    return json.dumps(summary, indent=2, default=str)

def execute_pandas_code(code: str, df: pd.DataFrame) -> str:
    local_vars = {'df': df, 'pd': pd}
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    try:
        # Basic sandbox to execute pandas code safely
        exec(code, {'__builtins__': __builtins__}, local_vars)
        output = redirected_output.getvalue()
        if not output.strip():
            return "Code executed successfully but printed nothing. Make sure to print the result."
        return output.strip()
    except Exception as e:
        return f"Error executing code: {str(e)}"
    finally:
        sys.stdout = old_stdout

def _call_llm_api(messages: List[Dict[str, str]], api_key: str, is_openai_format: bool) -> str:
    if is_openai_format:
        api_url = "https://api.openai.com/v1/chat/completions" if api_key.startswith("sk-") and "groq" not in api_key.lower() else "https://api.groq.com/openai/v1/chat/completions"
        model = os.getenv("AI_MODEL") or ("gpt-4o-mini" if "api.openai.com" in api_url else "llama-3.1-8b-instant")
        
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "temperature": 0.1}
            )
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            else:
                raise Exception(f"Provider Error: {res.text}")
    else:
        # Gemini format
        model = os.getenv("AI_MODEL", "gemini-1.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        gemini_messages = []
        for msg in messages:
            role = "user" if msg["role"] in ["user", "system"] else "model"
            gemini_messages.append({"role": role, "parts": [{"text": msg["content"]}]})
            
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={"contents": gemini_messages, "generationConfig": {"temperature": 0.1}}
            )
            if res.status_code == 200:
                return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            else:
                raise Exception(f"Gemini Error: {res.text}")

def answer_dataset_question(question: str, dataset: Dataset, file_path: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    q_clean = question.strip()
    if not q_clean:
        raise ValueError("Question cannot be empty")

    openai_key = os.getenv("OPENAI_API_KEY", getattr(settings, "openai_api_key", ""))
    gemini_key = os.getenv("GEMINI_API_KEY", getattr(settings, "gemini_api_key", ""))
    groq_key = os.getenv("GROQ_API_KEY", getattr(settings, "groq_api_key", ""))

    api_key = openai_key or groq_key or gemini_key
    if not api_key:
        return {
            "answer": "AI Provider is not configured. Please set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in the backend environment variables.",
            "sources": ["System Configuration Error"],
            "dataset_id": dataset.id
        }
        
    is_openai_format = bool(openai_key or groq_key)

    df = load_dataframe(file_path, dataset.file_type)
    if df is None:
        return {
            "answer": "I could not load the dataset file to perform calculations.",
            "sources": ["System Error"],
            "dataset_id": dataset.id
        }

    context_str = build_rich_context(dataset, file_path)

    system_prompt = f"""You are InsightFlow AI, a brilliant data analyst assistant.
You have access to a pandas DataFrame named `df` representing the user's dataset: '{dataset.original_filename}'.

DATASET SUMMARY:
{context_str}

INSTRUCTIONS:
1. You can chat normally and fluently in English, Hindi, or Hinglish.
2. If the user asks a conversational question, answer it directly.
3. If the user asks a question about the data that requires calculation (like row counts, averages, correlations, finding missing values, duplicate checks, sorting, etc.), you MUST write Python code to calculate the answer exactly. 
4. To run code, output a block starting EXACTLY with ```python and ending with ```. You must PRINT the final answer (e.g., `print(result)`).
5. The system will run your python code on the `df` dataframe and give you the output.
6. Once you get the output, explain the result clearly to the user.
7. Do NOT invent or guess calculations. If you need a calculation, write the python code.

Example:
User: How many missing values are in the Age column?
Assistant: Let me check that for you.
```python
print(df['Age'].isna().sum())
```
System Output: 5
Assistant: There are 5 missing values in the Age column.
"""

    messages = [{"role": "system", "content": system_prompt}]
    
    if history:
        for msg in history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": q_clean})

    try:
        # ReAct Loop (max 3 iterations)
        for _ in range(3):
            response_text = _call_llm_api(messages, api_key, is_openai_format)
            messages.append({"role": "assistant", "content": response_text})
            
            # Check if model wants to run python
            code_match = re.search(r'```python\n(.*?)\n```', response_text, re.DOTALL)
            if code_match:
                code = code_match.group(1)
                execution_output = execute_pandas_code(code, df)
                # Feed output back to model
                messages.append({"role": "user", "content": f"System Output:\n{execution_output}\n\nNow provide the final answer to the user based on this output."})
            else:
                # No code to run, we have the final answer
                return {
                    "answer": response_text,
                    "sources": ["InsightFlow AI", "Python/Pandas Execution"] if _ > 0 else ["InsightFlow AI"],
                    "dataset_id": dataset.id
                }
                
        # If loop exhausts
        return {
            "answer": messages[-1]["content"],
            "sources": ["InsightFlow AI (Loop Exceeded)"],
            "dataset_id": dataset.id
        }
    except Exception as e:
        return {
            "answer": f"I encountered an error connecting to the AI provider. Please ensure your API keys are valid and the provider is online.\nError details: {str(e)}",
            "sources": ["AI Provider Error"],
            "dataset_id": dataset.id
        }
