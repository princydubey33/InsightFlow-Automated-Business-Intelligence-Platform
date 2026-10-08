import pandas as pd
import numpy as np
import os
from typing import Dict, Any

def get_column_by_keywords(columns: list, keywords: list) -> str:
    """Finds the first column that matches any of the keywords (case-insensitive)."""
    columns_lower = {c.lower(): c for c in columns}
    
    # Try exact match first
    for kw in keywords:
        for c_lower, c_original in columns_lower.items():
            if kw == c_lower:
                return c_original
                
    # Try substring match
    for kw in keywords:
        for c_lower, c_original in columns_lower.items():
            if kw in c_lower:
                return c_original
                
    return None

def generate_analytics(file_path: str, file_type: str) -> Dict[str, Any]:
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
            return {"error": "Unsupported file type"}

        if df.empty:
            return {"error": "Dataset is empty"}

        # Define keyword mappings
        col_mappings = {
            'revenue': ['revenue', 'total_sales', 'total sales', 'total', 'sales', 'amount', 'price'],
            'quantity': ['quantity', 'qty'],
            'orders': ['order_id', 'order id', 'orderid', 'invoice_id', 'invoice', 'transaction_id', 'transaction', 'order'],
            'returns': ['return', 'refund'],
            'date': ['date', 'time', 'timestamp'],
            'product': ['product', 'item'],
            'category': ['category', 'type', 'department'],
            'city': ['city', 'location', 'region']
        }

        # Find columns
        cols = {k: get_column_by_keywords(df.columns.tolist(), v) for k, v in col_mappings.items()}
        
        analytics = {
            "totalRevenue": None,
            "totalOrders": None,
            "totalQuantity": None,
            "totalReturns": None,
            "averageOrderValue": None,
            "revenueByDate": [],
            "revenueByProduct": [],
            "revenueByCategory": [],
            "revenueByCity": [],
            "top5Products": [],
            "top5Categories": [],
            "top5Cities": [],
            "ordersVsReturnsByDate": []
        }

        # Clean revenue column (remove currency symbols and convert to numeric)
        rev_col = cols['revenue']
        if rev_col:
            if df[rev_col].dtype == object:
                df[rev_col] = df[rev_col].astype(str).str.replace(r'[\$,]', '', regex=True)
            df[rev_col] = pd.to_numeric(df[rev_col], errors='coerce').fillna(0)
            analytics["totalRevenue"] = float(df[rev_col].sum())
        
        # Calculate Orders
        order_col = cols['orders']
        if order_col:
            analytics["totalOrders"] = int(df[order_col].nunique())
        else:
            analytics["totalOrders"] = len(df) # Fallback to number of rows

        # Calculate AOV
        if analytics["totalRevenue"] is not None and analytics["totalOrders"]:
            analytics["averageOrderValue"] = analytics["totalRevenue"] / analytics["totalOrders"]

        # Calculate Quantity
        qty_col = cols['quantity']
        if qty_col:
            df[qty_col] = pd.to_numeric(df[qty_col], errors='coerce').fillna(0)
            analytics["totalQuantity"] = float(df[qty_col].sum())

        # Calculate Returns
        ret_col = cols['returns']
        if ret_col:
            # Assuming returns might be boolean, string ('Yes'/'No'), or numeric
            analytics["totalReturns"] = int(df[ret_col].notna().sum()) # simplistic approach, count non-null or positive values
            # Alternatively, if it's a numeric sum of returned items or amount
            if pd.api.types.is_numeric_dtype(df[ret_col]):
                analytics["totalReturns"] = float(df[ret_col].sum())

        # Aggregations requiring Revenue
        if rev_col:
            # Date
            date_col = cols['date']
            if date_col:
                # Convert to datetime
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                # Format to string date (YYYY-MM-DD) for grouping
                df['__formatted_date'] = df[date_col].dt.strftime('%Y-%m-%d')
                grouped_date = df.groupby('__formatted_date')[rev_col].sum().reset_index()
                # Sort by date
                grouped_date = grouped_date.sort_values('__formatted_date')
                analytics["revenueByDate"] = [{"name": row['__formatted_date'], "value": row[rev_col]} for index, row in grouped_date.dropna().iterrows()]

                # Calculate orders and returns by date
                orders_returns_data = []
                for date_val, group in df.dropna(subset=['__formatted_date']).groupby('__formatted_date'):
                    orders_count = int(group[order_col].nunique()) if order_col else len(group)
                    returns_count = 0
                    if ret_col:
                        if pd.api.types.is_numeric_dtype(df[ret_col]):
                            returns_count = float(group[ret_col].sum())
                        else:
                            returns_count = int(group[ret_col].notna().sum())
                    orders_returns_data.append({
                        "name": str(date_val),
                        "orders": orders_count,
                        "returns": returns_count
                    })
                # Sort
                orders_returns_data = sorted(orders_returns_data, key=lambda x: x["name"])
                analytics["ordersVsReturnsByDate"] = orders_returns_data

            # Product
            prod_col = cols['product']
            if prod_col:
                grouped_prod = df.groupby(prod_col)[rev_col].sum().reset_index().sort_values(by=rev_col, ascending=False)
                analytics["revenueByProduct"] = [{"name": str(row[prod_col]), "value": row[rev_col]} for index, row in grouped_prod.iterrows()]
                analytics["top5Products"] = analytics["revenueByProduct"][:5]

            # Category
            cat_col = cols['category']
            if cat_col:
                grouped_cat = df.groupby(cat_col)[rev_col].sum().reset_index().sort_values(by=rev_col, ascending=False)
                analytics["revenueByCategory"] = [{"name": str(row[cat_col]), "value": row[rev_col]} for index, row in grouped_cat.iterrows()]
                analytics["top5Categories"] = analytics["revenueByCategory"][:5]

            # City
            city_col = cols['city']
            if city_col:
                grouped_city = df.groupby(city_col)[rev_col].sum().reset_index().sort_values(by=rev_col, ascending=False)
                analytics["revenueByCity"] = [{"name": str(row[city_col]), "value": row[rev_col]} for index, row in grouped_city.iterrows()]
                analytics["top5Cities"] = analytics["revenueByCity"][:5]

        # Handle NaNs and convert types for JSON serialization
        # (This is implicitly handled by using float() and int() and str() above, 
        # but let's make sure there are no NaN values in the lists)

        return analytics

    except Exception as e:
        print(f"Error generating analytics: {e}")
        return {"error": str(e)}
