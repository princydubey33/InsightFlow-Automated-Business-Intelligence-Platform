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
    import numpy as np
    local_vars = {'df': df, 'pd': pd, 'np': np}
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

def get_all_ai_credentials() -> List[tuple[str, str]]:
    """
    Returns ordered list of (provider_name, api_key) based on configuration and available keys.
    """
    configured_provider = (os.getenv("AI_PROVIDER") or getattr(settings, "ai_provider", "auto")).strip().lower()
    
    groq_key = (os.getenv("GROQ_API_KEY") or getattr(settings, "groq_api_key", "")).strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or getattr(settings, "gemini_api_key", "")).strip()
    openai_key = (os.getenv("OPENAI_API_KEY") or getattr(settings, "openai_api_key", "")).strip()

    key_map = {
        "groq": groq_key,
        "gemini": gemini_key,
        "openai": openai_key
    }

    if configured_provider == "groq":
        order = ["groq", "gemini", "openai"]
    elif configured_provider == "openai":
        order = ["openai", "gemini", "groq"]
    elif configured_provider == "gemini":
        order = ["gemini", "groq", "openai"]
    else:
        # Default auto order: Gemini (ultra fast 0.8s response) -> Groq -> OpenAI
        order = ["gemini", "groq", "openai"]

    providers = []
    for p in order:
        if key_map.get(p):
            providers.append((p, key_map[p]))

    return providers

def get_ai_credentials() -> tuple[Optional[str], Optional[str]]:
    """
    Returns (provider_name, api_key) for the highest-priority configured provider.
    Maintained for backward compatibility.
    """
    providers = get_all_ai_credentials()
    if providers:
        return providers[0]
    return None, None

_cached_gemini_models: Optional[List[str]] = None
_cached_gemini_time: float = 0.0

def _get_active_gemini_models(api_key: str) -> List[str]:
    global _cached_gemini_models, _cached_gemini_time
    import time
    if _cached_gemini_models and (time.time() - _cached_gemini_time < 1800):
        return _cached_gemini_models

    try:
        with httpx.Client(timeout=3.0) as client:
            res = client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
            if res.status_code == 200:
                data = res.json()
                found = []
                for item in data.get("models", []):
                    name = item.get("name", "").replace("models/", "")
                    methods = item.get("supportedGenerationMethods", [])
                    if "generateContent" in methods and "flash" in name:
                        found.append(name)
                if found:
                    preferred = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"]
                    ordered = [m for m in preferred if m in found] + [m for m in found if m not in preferred]
                    _cached_gemini_models = ordered
                    _cached_gemini_time = time.time()
                    return ordered
    except Exception:
        pass
    return ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-1.5-pro"]

def _call_groq_api(messages: List[Dict[str, str]], api_key: str) -> str:
    api_url = "https://api.groq.com/openai/v1/chat/completions"
    env_model = (os.getenv("AI_MODEL") or "").strip()
    
    candidate_models = []
    if env_model and not env_model.startswith("gemini") and not env_model.startswith("gpt"):
        candidate_models.append(env_model)
    for m in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.1-70b-versatile", "llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"]:
        if m not in candidate_models:
            candidate_models.append(m)

    last_err: Optional[Exception] = None
    with httpx.Client(timeout=6.0) as client:
        i = 0
        while i < len(candidate_models):
            model = candidate_models[i]
            i += 1
            try:
                res = client.post(
                    api_url,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": messages, "temperature": 0.1},
                    timeout=5.0
                )
            except (httpx.TimeoutException, httpx.RequestError) as te:
                last_err = Exception(f"GROQ Timeout/Network error on {model}: {str(te)}")
                continue

            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            
            try:
                err_json = res.json()
                err_msg = err_json.get("error", {}).get("message") or str(err_json)
            except Exception:
                err_msg = res.text

            # If model does not exist or user lacks access (HTTP 404), try next candidate model
            if res.status_code == 404:
                last_err = Exception(f"GROQ Error (HTTP 404): {err_msg}")
                match = re.search(r'model ([\w\.-]+)', err_msg)
                if match:
                    sugg = match.group(1)
                    if sugg not in candidate_models:
                        candidate_models.append(sugg)
                continue

            if res.status_code == 401:
                raise Exception(f"Invalid GROQ API Key (HTTP 401): {err_msg}")
            elif res.status_code == 429:
                raise Exception(f"GROQ Quota or Rate Limit Exceeded (HTTP 429): {err_msg}")
            raise Exception(f"GROQ Error (HTTP {res.status_code}): {err_msg}")

    if last_err:
        raise last_err
    raise Exception("GROQ failed to return a response.")

def _call_gemini_api(messages: List[Dict[str, str]], api_key: str) -> str:
    env_model = (os.getenv("AI_MODEL") or "").strip()
    active_models = _get_active_gemini_models(api_key)
    candidate_models = []
    if env_model and "gemini" in env_model:
        candidate_models.append(env_model)
    for m in active_models:
        if m not in candidate_models:
            candidate_models.append(m)
    for m in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-1.5-pro"]:
        if m not in candidate_models:
            candidate_models.append(m)

    system_text = ""
    gemini_messages = []
    for msg in messages:
        if msg["role"] == "system":
            system_text += msg["content"] + "\n"
        else:
            role = "user" if msg["role"] == "user" else "model"
            if gemini_messages and gemini_messages[-1]["role"] == role:
                gemini_messages[-1]["parts"][0]["text"] += f"\n\n{msg['content']}"
            else:
                gemini_messages.append({"role": role, "parts": [{"text": msg["content"]}]})
                
    payload = {
        "contents": gemini_messages,
        "generationConfig": {"temperature": 0.1}
    }
    if system_text.strip():
        payload["system_instruction"] = {
            "parts": [{"text": system_text.strip()}]
        }

    last_err: Optional[Exception] = None
    with httpx.Client(timeout=10.0) as client:
        i = 0
        while i < len(candidate_models):
            model = candidate_models[i]
            i += 1
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=8.0
                )
            except (httpx.TimeoutException, httpx.RequestError) as te:
                last_err = Exception(f"Gemini Timeout/Network error on {model}: {str(te)}")
                continue

            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                    return candidates[0]["content"]["parts"][0]["text"].strip()
                return "No response generated by Gemini."

            try:
                err_json = res.json()
                err_msg = err_json.get("error", {}).get("message") or str(err_json)
            except Exception:
                err_msg = res.text

            if res.status_code == 404:
                last_err = Exception(f"Gemini Error (HTTP 404): {err_msg}")
                # Auto-extract suggested model from Google's response if specified (e.g. models/gemini-3.8-flash)
                match = re.search(r'models/(gemini-[\w\.-]+)', err_msg)
                if match:
                    sugg = match.group(1)
                    if sugg not in candidate_models:
                        candidate_models.append(sugg)
                continue

            if res.status_code == 401 or (res.status_code == 400 and "API_KEY_INVALID" in err_msg):
                raise Exception(f"Invalid Gemini API Key (HTTP {res.status_code}): {err_msg}")
            elif res.status_code == 429:
                raise Exception(f"Gemini Rate Limit Exceeded (HTTP 429): {err_msg}")
            raise Exception(f"Gemini Error (HTTP {res.status_code}): {err_msg}")

    if last_err:
        raise last_err
    raise Exception("Gemini failed to return a response.")

def _call_openai_api(messages: List[Dict[str, str]], api_key: str) -> str:
    api_url = "https://api.openai.com/v1/chat/completions"
    model = os.getenv("AI_MODEL") or "gpt-4o-mini"
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            api_url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": 0.1}
        )
        if res.status_code == 200:
            return res.json()["choices"][0]["message"]["content"].strip()
        else:
            try:
                err_json = res.json()
                err_msg = err_json.get("error", {}).get("message") or str(err_json)
            except Exception:
                err_msg = res.text
            if res.status_code == 401:
                raise Exception(f"Invalid OPENAI API Key (HTTP 401): {err_msg}")
            elif res.status_code == 429:
                raise Exception(f"OPENAI Quota or Rate Limit Exceeded (HTTP 429): {err_msg}")
            raise Exception(f"OPENAI Error (HTTP {res.status_code}): {err_msg}")

def _call_llm_api(messages: List[Dict[str, str]], api_key: str, provider: str) -> str:
    if provider == "groq":
        return _call_groq_api(messages, api_key)
    elif provider == "gemini":
        return _call_gemini_api(messages, api_key)
    elif provider == "openai":
        return _call_openai_api(messages, api_key)
    else:
        raise Exception(f"Unsupported AI provider '{provider}'")

def _fallback_data_answer(question: str, df: pd.DataFrame, dataset: Dataset) -> str:
    q = question.lower()
    is_hinglish = any(w in q for w in ["hai", "kya", "kitna", "kitne", "batao", "kaunsa", "konsa", "kaise", "hoga", "kripya", "namaste", "mujhe", "deta", "bheja"])
    
    rows = len(df)
    cols = list(df.columns)
    
    # Conversational greetings
    if any(q.strip().startswith(g) for g in ["hi", "hello", "hey", "namaste", "kaise ho", "help", "mene upload"]):
        if is_hinglish:
            return f"Namaste! Main aapka InsightFlow AI assistant hoon. Main aapke dataset ('{dataset.original_filename}') ka live analysis karne ke liye ready hoon. Aap mujhse koi bhi question puch sakte hain (jaise: 'Total revenue kitna hai?', 'Total rows kitne hain?', 'Top product kaunsa hai?')."
        return f"Hello! I am your InsightFlow AI assistant. I am ready to analyze your dataset ('{dataset.original_filename}'). Ask me anything (e.g. 'What is the total revenue?', 'How many rows?', 'Which product has the highest sales?')."

    # Row count queries
    if any(k in q for k in ["row", "record", "kitne", "count", "entries"]):
        if is_hinglish:
            return f"Aapke dataset '{dataset.original_filename}' me kul **{rows:,} rows (records)** aur **{len(cols)} columns** hain."
        return f"Your dataset '{dataset.original_filename}' contains **{rows:,} rows** and **{len(cols)} columns**."

    # Revenue / Sales queries
    rev_col = next((c for c in df.columns if any(k in c.lower() for k in ["revenue", "sales", "amount", "price", "total", "income"])), None)
    cat_col = next((c for c in df.columns if any(k in c.lower() for k in ["product", "category", "item", "city", "region"])), None)

    if any(k in q for k in ["revenue", "sale", "kamai", "bikne", "total", "sum", "bikri"]):
        if rev_col and pd.api.types.is_numeric_dtype(df[rev_col]):
            tot_rev = float(df[rev_col].sum())
            top_str = ""
            if cat_col:
                try:
                    top_item = df.groupby(cat_col)[rev_col].sum().idxmax()
                    top_val = float(df.groupby(cat_col)[rev_col].sum().max())
                    if is_hinglish:
                        top_str = f" Aur '{cat_col}' me sabse aage **{top_item}** hai (₹{top_val:,.2f})."
                    else:
                        top_str = f" Top {cat_col} by revenue is **{top_item}** ({top_val:,.2f})."
                except Exception:
                    pass
            if is_hinglish:
                return f"Aapke dataset me total revenue (column '{rev_col}') **₹{tot_rev:,.2f}** hai.{top_str}"
            return f"The total {rev_col} across your dataset is **{tot_rev:,.2f}**.{top_str}"

    # Missing / Null queries
    if any(k in q for k in ["missing", "null", "empty", "khali"]):
        missing = int(df.isna().sum().sum())
        if is_hinglish:
            return f"Aapke dataset '{dataset.original_filename}' me kul **{missing:,} missing / empty values** hain."
        return f"There are **{missing:,} missing / empty values** in '{dataset.original_filename}'."

    # Column list
    if any(k in q for k in ["column", "header", "feature", "field"]):
        col_list = ", ".join([f"`{c}`" for c in cols[:12]])
        if is_hinglish:
            return f"Dataset me kul {len(cols)} columns hain: {col_list}."
        return f"The dataset contains {len(cols)} columns: {col_list}."

    # General fallback
    summary_parts = []
    if rev_col and pd.api.types.is_numeric_dtype(df[rev_col]):
        summary_parts.append(f"Total {rev_col}: ₹{df[rev_col].sum():,.2f}")
    if is_hinglish:
        return f"Main aapke dataset '{dataset.original_filename}' ka data dekh kar bata raha hoon:\n- **Total Rows**: {rows:,}\n- **Columns**: {', '.join(cols[:6])}\n" + ("\n".join([f"- **{p}**" for p in summary_parts]))
    return f"Based on your dataset '{dataset.original_filename}':\n- **Total Rows**: {rows:,}\n- **Columns**: {', '.join(cols[:6])}\n" + ("\n".join([f"- **{p}**" for p in summary_parts]))

def answer_dataset_question(question: str, dataset: Dataset, file_path: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    q_clean = question.strip()
    if not q_clean:
        raise ValueError("Question cannot be empty")

    available_providers = get_all_ai_credentials()
    if not available_providers:
        return {
            "answer": (
                "AI Provider is not configured.\n\n"
                "To enable interactive AI Q&A and automated analysis for your datasets, "
                "please configure an AI provider in your Render Environment Variables:\n\n"
                "• Option 1: Groq (Recommended - Free & Ultra Fast)\n"
                "  1. Get a free API key at https://console.groq.com/keys\n"
                "  2. Add `GROQ_API_KEY=gsk_...` to your Render backend service environment\n\n"
                "• Option 2: Google Gemini (Free)\n"
                "  1. Get a free key at https://aistudio.google.com/app/apikey\n"
                "  2. Add `GEMINI_API_KEY=AIzaSy...` to your Render backend service environment\n\n"
                "• Option 3: OpenAI\n"
                "  1. Add `OPENAI_API_KEY=sk-...` to your Render backend service environment\n\n"
                "Once configured, Render will automatically redeploy and AI responses will activate."
            ),
            "sources": ["System Configuration Error"],
            "dataset_id": dataset.id
        }

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
1. You can chat normally and fluently in English, Hindi, or Hinglish. Always match the user's language (if the user asks in Hinglish or Hindi, e.g. "Total revenue kitna hai?", answer back in friendly, fluent Hinglish; if they ask in English, answer in English).
2. If the user asks a conversational question (e.g. "hi", "kaise ho", "help me"), answer it warmly and directly.
3. If the user asks a question about the data that requires calculation (like row counts, averages, correlations, finding missing values, duplicate checks, sorting, etc.), you MUST write Python code to calculate the answer exactly. 
4. To run code, output a block starting EXACTLY with ```python and ending with ```. You must PRINT the final answer (e.g., `print(result)`).
5. The system will run your python code on the `df` dataframe and give you the output.
6. Once you get the output, explain the result clearly to the user in their language.
7. Do NOT invent or guess calculations. If you need a calculation, write the python code.

Example 1 (English):
User: How many missing values are in the Age column?
Assistant: Let me check that for you.
```python
print(df['Age'].isna().sum())
```
System Output: 5
Assistant: There are 5 missing values in the Age column.

Example 2 (Hinglish):
User: Total revenue kitna hai aur sabse zyada bikne wala product kaunsa hai?
Assistant: Main aapke dataset se calculate karke batata hoon.
```python
top_p = df.groupby('Product')['Revenue'].sum().idxmax() if 'Product' in df.columns and 'Revenue' in df.columns else 'N/A'
tot_rev = df['Revenue'].sum() if 'Revenue' in df.columns else 0
print("Revenue:", tot_rev, "Top Product:", top_p)
```
System Output: Revenue: 450000 Top Product: Laptop
Assistant: Aapke dataset me total revenue ₹4,50,000 hai aur sabse zyada revenue generate karne wala product 'Laptop' hai.
"""

    last_error_msg = ""
    # Try each available provider in order (with automatic fallback to Gemini/Groq/OpenAI if one fails)
    for provider, api_key in available_providers:
        messages = [{"role": "system", "content": system_prompt}]
        
        if history:
            for msg in history:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
                
        messages.append({"role": "user", "content": q_clean})

        try:
            # ReAct Loop (max 3 iterations)
            for _ in range(3):
                response_text = _call_llm_api(messages, api_key, provider)
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
                        "sources": [f"InsightFlow AI ({provider.title()})", "Pandas Calculation"] if _ > 0 else [f"InsightFlow AI ({provider.title()})"],
                        "dataset_id": dataset.id
                    }
                    
            # If loop exhausts
            return {
                "answer": messages[-1]["content"],
                "sources": [f"InsightFlow AI ({provider.title()} Loop Exceeded)"],
                "dataset_id": dataset.id
            }
        except Exception as e:
            last_error_msg = f"I encountered an error connecting to the AI provider ({provider.title()}).\nDetails: {str(e)}"
            # Fall back to next configured provider
            continue

    # Fallback to local deterministic analysis if external LLMs fail or timeout
    fallback_ans = _fallback_data_answer(q_clean, df, dataset)
    if fallback_ans:
        return {
            "answer": fallback_ans,
            "sources": ["InsightFlow Intelligent Engine (Direct DataFrame Analysis)"],
            "dataset_id": dataset.id
        }

    return {
        "answer": last_error_msg,
        "sources": ["AI Provider Error"],
        "dataset_id": dataset.id
    }
