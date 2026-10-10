import pandas as pd
import numpy as np
import json
import os
from typing import Tuple, Dict, Any

def analyze_file(file_path: str, file_type: str) -> Tuple[int, int]:
    try:
        if file_type == 'text/csv' or file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            return 0, 0
            
        # Calculate full quality profile
        generate_quality_report(df, file_path)
            
        return df.shape[0], df.shape[1]
    except Exception as e:
        print(f"Error analyzing file: {e}")
        return 0, 0

def generate_quality_report(df: pd.DataFrame, file_path: str):
    total_rows = len(df)
    total_columns = len(df.columns)
    
    if total_rows == 0:
        return
        
    missing_values = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())
    
    column_summary = []
    identified_issues = []
    outlier_count = 0
    
    numeric_columns = 0
    categorical_columns = 0
    column_names = list(df.columns)
    data_types = {str(col): str(df[col].dtype) for col in df.columns}

    for col in df.columns:
        col_type = str(df[col].dtype)
        col_missing = int(df[col].isna().sum())
        col_unique = int(df[col].nunique())
        
        stat_dict = {
            "name": str(col),
            "type": col_type,
            "missing_count": col_missing,
            "unique_count": col_unique
        }
        
        if col_missing > 0:
            identified_issues.append({
                "id": f"missing_{col}",
                "type": "Missing Values",
                "column": str(col),
                "row": "-",
                "severity": "High" if col_missing / total_rows > 0.1 else "Medium",
                "suggestedFix": f"Impute or drop {col_missing} missing values"
            })
            
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_columns += 1
            stat_dict["min"] = float(df[col].min()) if not pd.isna(df[col].min()) else None
            stat_dict["max"] = float(df[col].max()) if not pd.isna(df[col].max()) else None
            stat_dict["mean"] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
            
            # IQR Outliers
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
            outlier_count += int(outliers)
            
            if outliers > 0:
                identified_issues.append({
                    "id": f"outlier_{col}",
                    "type": "Outliers",
                    "column": str(col),
                    "row": "-",
                    "severity": "Medium",
                    "suggestedFix": f"Review {outliers} outlier(s) using robust scaling"
                })
        else:
            categorical_columns += 1
                
        column_summary.append(stat_dict)
        
    if duplicate_rows > 0:
        identified_issues.append({
            "id": "duplicates_all",
            "type": "Duplicate Rows",
            "column": "All",
            "row": "-",
            "severity": "High",
            "suggestedFix": f"Remove {duplicate_rows} exact duplicate rows"
        })

    # Calculate Score
    score = 100
    penalty = (missing_values / (total_rows * total_columns)) * 50 if total_columns > 0 else 0
    penalty += (duplicate_rows / total_rows) * 30
    penalty += min((outlier_count / total_rows) * 20, 20)
    
    quality_score = max(0, int(100 - penalty))

    report = {
        "quality_score": quality_score,
        "total_rows": total_rows,
        "total_columns": total_columns,
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "invalid_values": 0, # Placeholder for more advanced type checking
        "outlier_count": outlier_count,
        "column_summary": column_summary,
        "identified_issues": identified_issues,
        "column_names": [str(c) for c in column_names],
        "data_types": data_types,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns
    }
    
    report_path = f"{file_path}.quality.json"
    with open(report_path, "w") as f:
        json.dump(report, f)

def apply_fix(file_path: str, file_type: str, issue_id: str, issue_type: str, column: str) -> bool:
    try:
        if file_type == 'text/csv' or file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or file_path.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            return False

        if issue_type == "Duplicate Rows":
            df.drop_duplicates(inplace=True)
        elif issue_type == "Missing Values" and column in df.columns:
            if pd.api.types.is_numeric_dtype(df[column]):
                df[column].fillna(df[column].mean(), inplace=True)
            else:
                df[column].fillna(df[column].mode()[0] if not df[column].mode().empty else "Unknown", inplace=True)
        elif issue_type == "Outliers" and column in df.columns:
            Q1 = df[column].quantile(0.25)
            Q3 = df[column].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            # Cap outliers
            df[column] = np.where(df[column] < lower_bound, lower_bound, df[column])
            df[column] = np.where(df[column] > upper_bound, upper_bound, df[column])

        # Save back to file
        if file_type == 'text/csv' or file_path.endswith('.csv'):
            df.to_csv(file_path, index=False)
        else:
            df.to_excel(file_path, index=False)

        # Regenerate the quality report to reflect changes
        generate_quality_report(df, file_path)
        return True
    except Exception as e:
        print(f"Error applying fix: {e}")
        return False
