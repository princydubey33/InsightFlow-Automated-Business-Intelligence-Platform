import os
import json
import pandas as pd
from typing import Dict, Any, List

from .dataset_service import generate_quality_report
from .analytics_service import generate_analytics
from .insights_service import generate_insights
from ..models.dataset import Dataset

def generate_report(dataset: Dataset, file_path: str) -> Dict[str, Any]:
    """
    Generates a consolidated business report by reusing Data Quality,
    Analytics, and Insights services for the given dataset.
    """
    # 1. Data Quality Service reuse
    quality_report_path = f"{file_path}.quality.json"
    quality_data: Dict[str, Any] = {}
    
    if os.path.exists(quality_report_path):
        try:
            with open(quality_report_path, "r", encoding="utf-8") as f:
                quality_data = json.load(f)
        except Exception:
            quality_data = {}
            
    if not quality_data:
        try:
            if dataset.file_type == 'text/csv' or file_path.endswith('.csv'):
                try:
                    df = pd.read_csv(file_path)
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(file_path, encoding='utf-16')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, encoding='latin1')
            elif dataset.file_type in [
                'application/vnd.ms-excel', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ] or file_path.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file_path)
            else:
                df = pd.DataFrame()

            if not df.empty:
                generate_quality_report(df, file_path)
                if os.path.exists(quality_report_path):
                    with open(quality_report_path, "r", encoding="utf-8") as f:
                        quality_data = json.load(f)
        except Exception:
            quality_data = {}

    # 2. Analytics Service reuse
    analytics_data = generate_analytics(file_path, dataset.file_type)
    if not isinstance(analytics_data, dict) or "error" in analytics_data:
        analytics_data = {}

    # 3. Automated Insights Service reuse
    try:
        automated_insights = generate_insights(file_path, dataset.file_type)
        if not isinstance(automated_insights, list):
            automated_insights = []
    except Exception:
        automated_insights = []

    # 4. Extract metrics safely
    total_rows = quality_data.get("total_rows") if quality_data.get("total_rows") is not None else dataset.row_count
    total_columns = quality_data.get("total_columns") if quality_data.get("total_columns") is not None else dataset.column_count
    data_quality_score = quality_data.get("quality_score")
    missing_values = quality_data.get("missing_values")
    duplicate_rows = quality_data.get("duplicate_rows")

    total_revenue = analytics_data.get("totalRevenue")
    total_orders = analytics_data.get("totalOrders")
    total_quantity = analytics_data.get("totalQuantity")
    total_returns = analytics_data.get("totalReturns")
    total_refunds = analytics_data.get("totalRefunds")
    average_order_value = analytics_data.get("averageOrderValue")

    top_products = analytics_data.get("top5Products") or []
    top_categories = analytics_data.get("top5Categories") or []
    top_cities = analytics_data.get("top5Cities") or []
    city_label = analytics_data.get("cityLabel", "Cities")

    upload_date = dataset.uploaded_at.isoformat() if dataset.uploaded_at else None

    report: Dict[str, Any] = {
        "dataset_name": dataset.original_filename,
        "upload_date": upload_date,
        "total_rows": total_rows,
        "total_columns": total_columns,
        "quality_score": data_quality_score,
        "data_quality_score": data_quality_score,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_quantity": total_quantity,
        "total_returns": total_returns,
        "total_refunds": total_refunds,
        "average_order_value": average_order_value,
        "top_products": top_products,
        "top_categories": top_categories,
        "top_cities": top_cities,
        "city_label": city_label,
        "automated_insights": automated_insights,

        # Aliases for client compatibility
        "datasetName": dataset.original_filename,
        "uploadDate": upload_date,
        "totalRows": total_rows,
        "totalColumns": total_columns,
        "qualityScore": data_quality_score,
        "dataQualityScore": data_quality_score,
        "missingValues": missing_values,
        "duplicateRows": duplicate_rows,
        "totalRevenue": total_revenue,
        "totalOrders": total_orders,
        "totalQuantity": total_quantity,
        "totalReturns": total_returns,
        "totalRefunds": total_refunds,
        "averageOrderValue": average_order_value,
        "topProducts": top_products,
        "topCategories": top_categories,
        "topCities": top_cities,
        "cityLabel": city_label,
        "automatedInsights": automated_insights,
    }

    return report
