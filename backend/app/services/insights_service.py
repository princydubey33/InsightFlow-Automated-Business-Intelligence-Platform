import pandas as pd
import numpy as np
from typing import List, Dict, Any
from .analytics_service import generate_analytics, get_column_by_keywords

def generate_insights(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    insights = []
    
    # 1. Get base analytics data
    analytics_data = generate_analytics(file_path, file_type)
    if "error" in analytics_data:
        return [{"type": "error", "title": "Error generating insights", "description": analytics_data["error"], "value": "N/A", "severity": "warning"}]

    # 2. Total Revenue
    if analytics_data.get("totalRevenue") is not None:
        val = analytics_data["totalRevenue"]
        insights.append({
            "type": "metric",
            "title": "Total Revenue",
            "description": "Total revenue generated across all records.",
            "value": f"₹{val:,.2f}",
            "severity": "info"
        })

    # 3. Total Orders
    if analytics_data.get("totalOrders") is not None:
        val = analytics_data["totalOrders"]
        insights.append({
            "type": "metric",
            "title": "Total Orders",
            "description": "Total number of unique orders.",
            "value": f"{val:,}",
            "severity": "info"
        })

    # 4. Average Order Value
    if analytics_data.get("averageOrderValue") is not None:
        val = analytics_data["averageOrderValue"]
        insights.append({
            "type": "metric",
            "title": "Average Order Value",
            "description": "Average revenue per order.",
            "value": f"₹{val:,.2f}",
            "severity": "info",
            "recommendation": "Consider bundling products to increase AOV."
        })

    # 5. Highest Revenue Product
    top_products = analytics_data.get("top5Products", [])
    if top_products:
        top_product = top_products[0]
        insights.append({
            "type": "metric",
            "title": "Top Performing Product",
            "description": "The product generating the highest revenue.",
            "value": f"{top_product['name']} (₹{top_product['value']:,.2f})",
            "severity": "success",
            "recommendation": "Ensure adequate stock levels and feature in marketing campaigns."
        })

    # 6. Highest Revenue Category
    top_cats = analytics_data.get("top5Categories", [])
    if top_cats:
        best_cat = top_cats[0]
        insights.append({
            "type": "metric",
            "title": "Top Category",
            "description": "The category generating the highest revenue.",
            "value": f"{best_cat['name']} (₹{best_cat['value']:,.2f})",
            "severity": "success",
            "recommendation": "Expand product offerings in this category."
        })
        
        if len(top_cats) > 1:
            worst_cat = top_cats[-1]
            insights.append({
                "type": "metric",
                "title": "Lowest Category in Top 5",
                "description": "The category generating the least revenue among the top groups.",
                "value": f"{worst_cat['name']} (₹{worst_cat['value']:,.2f})",
                "severity": "warning",
                "recommendation": "Investigate pricing or demand issues for this category."
            })

    # 7. Highest Revenue City
    top_cities = analytics_data.get("top5Cities", [])
    if top_cities:
        best_city = top_cities[0]
        insights.append({
            "type": "metric",
            "title": "Top City by Revenue",
            "description": "The city generating the highest revenue.",
            "value": f"{best_city['name']} (₹{best_city['value']:,.2f})",
            "severity": "success",
            "recommendation": "Allocate more local marketing budget to this region."
        })

    # 8. Revenue Trend
    rev_dates = analytics_data.get("revenueByDate", [])
    if len(rev_dates) > 1:
        first_val = rev_dates[0]['value']
        last_val = rev_dates[-1]['value']
        if first_val > 0:
            growth = ((last_val - first_val) / first_val) * 100
            trend_str = "increasing" if growth > 0 else "decreasing"
            sev = "success" if growth > 0 else "warning"
            insights.append({
                "type": "trend",
                "title": "Revenue Trend",
                "description": f"Comparing the first and last dates available.",
                "value": f"{trend_str.capitalize()} ({growth:+.1f}%)",
                "severity": sev,
                "recommendation": "Keep up the current strategy." if growth > 0 else "Investigate recent drop in sales."
            })

    # 9. Return Rate
    tot_orders = analytics_data.get("totalOrders")
    tot_returns = analytics_data.get("totalReturns")
    if tot_orders and tot_returns and tot_orders > 0:
        ret_rate = (tot_returns / tot_orders) * 100
        sev = "warning" if ret_rate > 10 else "info"
        insights.append({
            "type": "metric",
            "title": "Return Rate",
            "description": "Percentage of orders returned.",
            "value": f"{ret_rate:.1f}%",
            "severity": sev,
            "recommendation": "Review product descriptions and quality." if ret_rate > 10 else "Return rate is within typical bounds."
        })

    # 10. Advanced Pandas Insights (Highest-return product, Data quality)
    try:
        if file_type == 'text/csv' or file_path.endswith('.csv'):
            try:
                df = pd.read_csv(file_path)
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, encoding='utf-16')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding='latin1')
        elif file_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            df = pd.DataFrame()

        if not df.empty:
            col_mappings = {
                'returns': ['return', 'refund'],
                'product': ['product', 'item']
            }
            cols = {k: get_column_by_keywords(df.columns.tolist(), v) for k, v in col_mappings.items()}
            
            # Highest-return product
            ret_col = cols['returns']
            prod_col = cols['product']
            
            if ret_col and prod_col:
                is_return = pd.Series(False, index=df.index)
                if pd.api.types.is_numeric_dtype(df[ret_col]):
                    is_return = df[ret_col] > 0
                else:
                    is_return = df[ret_col].astype(str).str.lower().isin(['yes', 'true', '1', 'y', 'refunded', 'returned'])

                # Group by product and sum returns
                if is_return.any():
                    grouped_ret = df[is_return].groupby(prod_col).size()
                    
                    if not grouped_ret.empty and grouped_ret.max() > 0:
                        worst_prod = grouped_ret.idxmax()
                        worst_ret_val = grouped_ret.max()
                        insights.append({
                            "type": "metric",
                            "title": "Highest Return Product",
                            "description": "The product with the most returns.",
                            "value": f"{worst_prod} ({worst_ret_val} returns)",
                            "severity": "warning",
                            "recommendation": "Check for defects or update product descriptions."
                        })
                    
            # Data quality warnings (e.g., missing values)
            total_missing = df.isnull().sum().sum()
            if total_missing > 0:
                insights.append({
                    "type": "warning",
                    "title": "Data Quality Issue",
                    "description": "Missing values detected across the dataset.",
                    "value": f"{total_missing} empty cells",
                    "severity": "warning",
                    "recommendation": "Review data collection processes to minimize missing information."
                })
                
    except Exception as e:
        pass # Skip advanced insights if dataframe loading fails

    return insights
