import os
import json
import re
from typing import Dict, Any, List, Optional
import httpx

from .analytics_service import generate_analytics
from .insights_service import generate_insights
from ..models.dataset import Dataset
from ..config import settings

def build_compact_context(dataset: Dataset, file_path: str) -> Dict[str, Any]:
    """
    Builds a compact, summarized business context from Analytics,
    Data Quality, and Insights services without sending raw tabular rows.
    """
    # 1. Quality report
    quality_report_path = f"{file_path}.quality.json"
    quality_data = {}
    if os.path.exists(quality_report_path):
        try:
            with open(quality_report_path, "r", encoding="utf-8") as f:
                quality_data = json.load(f)
        except Exception:
            quality_data = {}

    # 2. Analytics
    analytics_data = generate_analytics(file_path, dataset.file_type)
    if not isinstance(analytics_data, dict) or "error" in analytics_data:
        analytics_data = {}

    # 3. Insights
    try:
        insights = generate_insights(file_path, dataset.file_type)
        if not isinstance(insights, list):
            insights = []
    except Exception:
        insights = []

    # Safe metrics
    total_rows = quality_data.get("total_rows", dataset.row_count)
    total_columns = quality_data.get("total_columns", dataset.column_count)
    quality_score = quality_data.get("quality_score")
    missing_values = quality_data.get("missing_values")
    duplicate_rows = quality_data.get("duplicate_rows")

    total_revenue = analytics_data.get("totalRevenue")
    total_orders = analytics_data.get("totalOrders")
    total_quantity = analytics_data.get("totalQuantity")
    total_returns = analytics_data.get("totalReturns")
    average_order_value = analytics_data.get("averageOrderValue")

    top_products = analytics_data.get("top5Products") or []
    top_categories = analytics_data.get("top5Categories") or []
    top_cities = analytics_data.get("top5Cities") or []
    revenue_by_date = analytics_data.get("revenueByDate") or []

    return {
        "dataset_name": dataset.original_filename,
        "total_rows": total_rows,
        "total_columns": total_columns,
        "quality_score": quality_score,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_quantity": total_quantity,
        "total_returns": total_returns,
        "average_order_value": average_order_value,
        "top_products": top_products,
        "top_categories": top_categories,
        "top_cities": top_cities,
        "revenue_by_date": revenue_by_date,
        "automated_insights": insights,
    }

def _query_external_llm(question: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Attempts to answer the question using configured external LLM provider.
    Returns None if no provider is configured or if the external call fails.
    """
    openai_key = os.getenv("OPENAI_API_KEY", getattr(settings, "openai_api_key", ""))
    gemini_key = os.getenv("GEMINI_API_KEY", getattr(settings, "gemini_api_key", ""))
    groq_key = os.getenv("GROQ_API_KEY", getattr(settings, "groq_api_key", ""))

    system_prompt = (
        "You are InsightFlow AI, an executive business intelligence assistant. "
        "Answer the user's question using ONLY the provided business summary context. "
        "If a metric is unavailable or the question cannot be answered from this dataset summary, "
        "explicitly state: 'This question cannot be answered from the uploaded dataset.' "
        "Never invent numbers or assume external statistics."
    )

    context_str = json.dumps(context, indent=2, default=str)
    user_prompt = f"Dataset Summary:\n{context_str}\n\nQuestion: {question}"

    # 1. OpenAI or Groq
    api_key = openai_key or groq_key
    if api_key:
        api_url = "https://api.openai.com/v1/chat/completions" if openai_key else "https://api.groq.com/openai/v1/chat/completions"
        model = os.getenv("AI_MODEL") or ("gpt-4o-mini" if openai_key else "llama-3.1-8b-instant")
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    api_url,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.2
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    answer = data["choices"][0]["message"]["content"].strip()
                    return {
                        "answer": answer,
                        "sources": ["Configured LLM", f"Dataset: {context['dataset_name']}"]
                    }
        except Exception:
            pass

    # 2. Gemini
    if gemini_key:
        model = os.getenv("AI_MODEL", "gemini-1.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [
                            {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
                        ],
                        "generationConfig": {"temperature": 0.2}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    answer = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return {
                        "answer": answer,
                        "sources": ["Gemini AI", f"Dataset: {context['dataset_name']}"]
                    }
        except Exception:
            pass

    return None

def answer_dataset_question(question: str, dataset: Dataset, file_path: str) -> Dict[str, Any]:
    """
    Answers questions about the uploaded dataset using compact business context,
    relying on configured LLM when available, and falling back to a deterministic
    domain-specific BI analytical engine.
    """
    q_clean = question.strip()
    if not q_clean:
        raise ValueError("Question cannot be empty")

    context = build_compact_context(dataset, file_path)

    # 1. Try external LLM if configured
    llm_result = _query_external_llm(q_clean, context)
    if llm_result:
        return {
            "answer": llm_result["answer"],
            "sources": llm_result["sources"],
            "dataset_id": dataset.id
        }

    # 2. High-precision semantic BI engine
    q_lower = q_clean.lower()
    sources = []
    answer = ""

    rev = context.get("total_revenue")
    orders = context.get("total_orders")
    aov = context.get("average_order_value")
    returns = context.get("total_returns")
    top_prods = context.get("top_products") or []
    top_cats = context.get("top_categories") or []
    top_cities = context.get("top_cities") or []
    q_score = context.get("quality_score")
    missing_vals = context.get("missing_values")
    dup_rows = context.get("duplicate_rows")
    insights = context.get("automated_insights") or []

    # Question matching rules
    # A. Highest revenue product / top product
    if any(k in q_lower for k in [
        "product has the highest revenue", "which product", "highest revenue product", 
        "top product", "best selling product", "highest selling product", "product generated"
    ]):
        if top_prods:
            best = top_prods[0]
            answer = f"The product generating the highest revenue is '{best['name']}' with ₹{best['value']:,.2f} in sales."
            if len(top_prods) > 1:
                others = ", ".join([f"{p['name']} (₹{p['value']:,.2f})" for p in top_prods[1:4]])
                answer += f" Followed by {others}."
            sources = ["Analytics - Top Products", "Dataset Rankings"]
        else:
            answer = "Product-level breakdown is not available in the columns of this dataset."
            sources = ["Dataset Schema"]

    # B. Best city / location
    elif any(k in q_lower for k in [
        "city performs best", "which city", "top city", "best performing city", "best city", "highest city"
    ]):
        if top_cities:
            best = top_cities[0]
            answer = f"The best performing city is '{best['name']}' with total revenue of ₹{best['value']:,.2f}."
            if len(top_cities) > 1:
                others = ", ".join([f"{c['name']} (₹{c['value']:,.2f})" for c in top_cities[1:3]])
                answer += f" Additional top locations include {others}."
            sources = ["Analytics - Top Cities by Revenue"]
        else:
            answer = "City or geographic location data is not available in this dataset."
            sources = ["Dataset Schema"]

    # C. Return rate
    elif any(k in q_lower for k in ["return rate", "returns", "refund rate", "how many returns"]):
        if returns is not None and orders:
            ret_pct = (returns / orders) * 100 if orders > 0 else 0
            answer = f"The return rate is {ret_pct:.1f}% ({returns} returned units out of {orders} orders)."
            # Check if there is an insight for highest return product
            ret_insight = next((i for i in insights if "return" in i.get("title", "").lower()), None)
            if ret_insight:
                answer += f" {ret_insight.get('description', '')} ({ret_insight.get('value', '')})."
                if ret_insight.get("recommendation"):
                    answer += f" Recommendation: {ret_insight.get('recommendation')}"
            sources = ["Analytics - Returns", "Automated Insights - Return Rate"]
        else:
            answer = "Return or refund metrics were not found in this dataset."
            sources = ["Analytics Service"]

    # D. Total revenue
    elif any(k in q_lower for k in [
        "total revenue", "what is the revenue", "how much revenue", "total sales", "overall revenue"
    ]):
        if rev is not None:
            answer = f"The total revenue for dataset '{dataset.original_filename}' is ₹{rev:,.2f} across {orders or 'all'} orders."
            if aov is not None:
                answer += f" The average order value (AOV) is ₹{aov:,.2f}."
            sources = ["Analytics - Total Revenue", "Analytics - Average Order Value"]
        else:
            answer = "Total revenue could not be calculated because a numeric revenue/sales column was not identified."
            sources = ["Analytics Service"]

    # E. Total orders / Average order value
    elif any(k in q_lower for k in ["total orders", "how many orders", "order count"]):
        if orders is not None:
            answer = f"There are {orders:,} unique orders in this dataset."
            sources = ["Analytics - Total Orders"]
        else:
            answer = "Order count is not available in this dataset."
            sources = ["Analytics Service"]

    elif any(k in q_lower for k in ["average order value", "aov"]):
        if aov is not None:
            answer = f"The average order value (AOV) is ₹{aov:,.2f}."
            sources = ["Analytics - Average Order Value"]
        else:
            answer = "Average order value is not available for this dataset."
            sources = ["Analytics Service"]

    # F. Why might revenue be changing / revenue high / drivers
    elif any(k in q_lower for k in [
        "why might revenue be changing", "why is revenue changing", "why is revenue high", 
        "why is revenue low", "revenue trend", "why revenue"
    ]):
        trend_insight = next((i for i in insights if "trend" in i.get("type", "").lower() or "revenue trend" in i.get("title", "").lower()), None)
        drivers = []
        if top_cats:
            drivers.append(f"dominant sales in '{top_cats[0]['name']}' (₹{top_cats[0]['value']:,.2f})")
        if top_prods:
            drivers.append(f"strong performance from '{top_prods[0]['name']}' (₹{top_prods[0]['value']:,.2f})")

        reasons = ", combined with ".join(drivers) if drivers else "recorded transaction volumes"
        if trend_insight:
            answer = f"Revenue shows a {trend_insight.get('value', 'dynamic')} pattern ({trend_insight.get('description', '')}). Key growth is anchored by {reasons}."
            if trend_insight.get("recommendation"):
                answer += f" Suggested strategy: {trend_insight.get('recommendation')}"
        else:
            answer = f"Revenue performance is primarily driven by {reasons} across {orders or 'multiple'} orders."
        sources = ["Analytics - Revenue Distribution", "Automated Insights"]

    # G. Recommendations / What should I improve
    elif any(k in q_lower for k in [
        "what should i improve", "recommendation", "what to improve", "how to improve", "suggestions", "next steps"
    ]):
        recs = [f"- {i['title']}: {i['recommendation']}" for i in insights if i.get("recommendation")]
        if recs:
            answer = "Based on automated intelligence from your dataset, here are the key areas to improve:\n" + "\n".join(recs)
            sources = ["Automated Insights - Actionable Recommendations"]
        else:
            answer = "No immediate warnings were detected. Monitor top product stock levels and maintain current marketing allocations."
            sources = ["Automated Insights"]

    # H. Data quality issues / health
    elif any(k in q_lower for k in [
        "data quality", "quality issues", "missing values", "duplicate", "clean", "explain my data quality"
    ]):
        parts = []
        if q_score is not None:
            parts.append(f"Overall Data Quality Score is {q_score}%.")
        if missing_vals is not None:
            parts.append(f"{missing_vals} empty/missing cell(s) detected.")
        if dup_rows is not None:
            parts.append(f"{dup_rows} duplicate row(s) identified.")
        
        answer = " ".join(parts) if parts else "Data quality metrics are within normal thresholds."
        sources = ["Data Quality Profile", "Data Quality Service"]

    # I. Top Categories
    elif any(k in q_lower for k in ["category", "categories"]):
        if top_cats:
            best = top_cats[0]
            answer = f"The top performing category is '{best['name']}' with ₹{best['value']:,.2f} in revenue."
            if len(top_cats) > 1:
                others = ", ".join([f"{c['name']} (₹{c['value']:,.2f})" for c in top_cats[1:]])
                answer += f" Other categories include: {others}."
            sources = ["Analytics - Top Categories"]
        else:
            answer = "Category information is not available in this dataset."
            sources = ["Dataset Schema"]

    # J. Unrelated or unanswerable
    else:
        answer = (
            f"This question cannot be answered from the uploaded dataset '{dataset.original_filename}'. "
            "Available metrics include total revenue, total orders, average order value, top products, "
            "top categories, top cities, return rates, and data quality scores."
        )
        sources = []

    return {
        "answer": answer,
        "sources": sources,
        "dataset_id": dataset.id
    }
