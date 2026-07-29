from fastapi import FastAPI, UploadFile, File, Query
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import uuid
import os
import time
import pickle

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://panboard.pages.dev",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disk-based cache configuration for multi-worker support and memory protection
CACHE_DIR = os.path.join(os.path.dirname(__file__), "data_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(dataset_id: str) -> str:
    return os.path.join(CACHE_DIR, f"{dataset_id}.pkl")

def save_to_cache(dataset_id: str, df: pd.DataFrame, original_df: pd.DataFrame, filename: str):
    with open(get_cache_path(dataset_id), "wb") as f:
        pickle.dump((df, original_df, filename), f)

def load_from_cache(dataset_id: str):
    path = get_cache_path(dataset_id)
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)

def clean_expired_cache():
    now = time.time()
    for fname in os.listdir(CACHE_DIR):
        fpath = os.path.join(CACHE_DIR, fname)
        if os.path.isfile(fpath):
            # If modified more than 30 minutes (1800 seconds) ago, evict
            if now - os.path.getmtime(fpath) > 1800:
                try:
                    os.remove(fpath)
                except Exception:
                    pass
def generate_insights(df: pd.DataFrame):
    insights = []
    total_rows = len(df)
    if total_rows == 0:
        return insights

    # 1. Missingness Insights
    total_cells = df.size
    total_missing = df.isnull().sum().sum()
    missing_pct = (total_missing / total_cells) * 100 if total_cells > 0 else 0

    if missing_pct > 0:
        for col in df.columns:
            col_missing = df[col].isnull().sum()
            col_pct = (col_missing / total_rows) * 100
            if col_pct >= 20:
                insights.append({
                    "type": "warning",
                    "category": "Missing Data",
                    "title": f"High Missing Values in '{col}'",
                    "description": f"Column '{col}' has {col_missing} missing values ({col_pct:.1f}% of rows). Consider using mean/mode imputation.",
                    "column": col
                })

    # 2. Outlier Detection (IQR Method)
    numeric_df = df.select_dtypes(include=['number'])
    for col in numeric_df.columns:
        valid_series = numeric_df[col].dropna()
        if len(valid_series) >= 4:
            q1 = valid_series.quantile(0.25)
            q3 = valid_series.quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                outliers = valid_series[(valid_series < lower_bound) | (valid_series > upper_bound)]
                outlier_count = len(outliers)
                if outlier_count > 0:
                    outlier_pct = (outlier_count / len(valid_series)) * 100
                    insights.append({
                        "type": "info" if outlier_pct < 10 else "warning",
                        "category": "Outlier Detection",
                        "title": f"Outliers Detected in '{col}'",
                        "description": f"Found {outlier_count} statistical outlier(s) ({outlier_pct:.1f}%) outside bounds [{lower_bound:.2f}, {upper_bound:.2f}].",
                        "column": col
                    })

    # 3. High Correlation Detection
    if len(numeric_df.columns) >= 2:
        corr_matrix = numeric_df.corr().abs()
        cols = corr_matrix.columns
        for i in range(len(cols)):
            for j in range(i + 1, len(cols)):
                c1, c2 = cols[i], cols[j]
                val = corr_matrix.loc[c1, c2]
                if not pd.isna(val) and val >= 0.85:
                    insights.append({
                        "type": "info",
                        "category": "Correlation",
                        "title": f"Strong Correlation ({c1} & {c2})",
                        "description": f"Columns '{c1}' and '{c2}' are strongly correlated (r = {val:.2f}).",
                        "column": c1
                    })

    # Health score
    health_score = max(0, min(100, int(100 - (missing_pct * 0.8))))
    if not insights:
        insights.append({
            "type": "success",
            "category": "Data Quality",
            "title": "Clean Dataset Profile",
            "description": f"No critical missing values or extreme anomalies detected. Data health score: {health_score}%.",
            "column": None
        })

    return {
        "health_score": health_score,
        "items": insights
    }

def analyze_dataframe(df: pd.DataFrame, filename: str, dataset_id: str):
    # Get data types and missing values
    info = pd.DataFrame({
        "type": df.dtypes.astype(str),
        "missing": df.isnull().sum(),
        "unique": df.nunique()
    }).to_dict(orient="index")

    # Get categorical summaries (top values)
    categorical_summary = {}
    for col in df.select_dtypes(include=['object', 'category']).columns:
        counts = df[col].value_counts().head(15).to_dict()
        categorical_summary[col] = [{"name": str(k), "value": int(v)} for k, v in counts.items()]

    # Numeric statistics
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    stats = {}
    for col in numeric_cols:
        mean_val = df[col].mean()
        median_val = df[col].median()
        min_val = df[col].min()
        max_val = df[col].max()
        std_val = df[col].std()

        stats[col] = {
            "mean": float(mean_val) if not pd.isna(mean_val) else 0.0,
            "median": float(median_val) if not pd.isna(median_val) else 0.0,
            "min": float(min_val) if not pd.isna(min_val) else 0.0,
            "max": float(max_val) if not pd.isna(max_val) else 0.0,
            "std": float(std_val) if not pd.isna(std_val) else 0.0,
        }

    # Numeric data for correlation
    numeric_df = df.select_dtypes(include=['number'])
    correlation = numeric_df.corr().fillna(0).to_dict() if not numeric_df.empty else {}

    # Sample data for raw table (limit to first 100 rows)
    sample_df = df.head(100).copy()
    for col in sample_df.columns:
        if pd.api.types.is_datetime64_any_dtype(sample_df[col]):
            sample_df[col] = sample_df[col].dt.strftime('%Y-%m-%d %H:%M:%S').fillna("")
    sample_data = sample_df.fillna("").to_dict(orient="records")

    # Generate insights
    insights_data = generate_insights(df)

    # Return comprehensive results
    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "columns": df.columns.tolist(),
        "numeric_columns": numeric_cols,
        "categorical_columns": df.select_dtypes(include=['object', 'category']).columns.tolist(),
        "row_count": len(df),
        "info": info,
        "stats": stats,
        "categorical_summary": categorical_summary,
        "correlation": correlation,
        "sample_data": sample_data,
        "insights": insights_data
    }

@app.get("/")
async def root():
    return {"message": "Dashboard as a Service API is running"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Read the file content
        contents = await file.read()
        
        # Process based on file type (case-insensitive checks)
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename_lower.endswith(('.xls', '.xlsx', '.xlsm', '.xlsb', '.ods')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return {"error": "Unsupported file type. Please upload a CSV or Excel file."}

        # Evict old cached files before saving new ones
        clean_expired_cache()

        # Generate a unique ID for this session/dataset
        dataset_id = str(uuid.uuid4())
        save_to_cache(dataset_id, df, df.copy(), file.filename)

        return analyze_dataframe(df, file.filename, dataset_id)
    except Exception as e:
        return {"error": f"Failed to process file: {str(e)}"}

@app.post("/api/transform/{dataset_id}")
async def transform_dataset(dataset_id: str, payload: dict):
    # Evict old cached files
    clean_expired_cache()

    cached = load_from_cache(dataset_id)
    if not cached:
        return {"error": "Dataset session not found or expired. Please upload the file again."}
    
    try:
        df, original_df, filename = cached
        
        action = payload.get("action")
        
        if not action:
            return {"error": "Missing 'action' parameter."}
            
        if action == "reset":
            df = original_df.copy()
        else:
            # Make a copy to avoid mutation side-effects during operations
            df = df.copy()
            column = payload.get("column")
            
            if action != "filter" and not column:
                return {"error": "Missing 'column' parameter."}
                
            if column and column not in df.columns:
                return {"error": f"Column '{column}' not found in the dataset."}
                
            if action == "impute":
                strategy = payload.get("strategy")
                if not strategy:
                    return {"error": "Missing 'strategy' parameter for imputation."}
                    
                val = None
                if strategy == "mean":
                    if pd.api.types.is_numeric_dtype(df[column]):
                        val = df[column].mean()
                    else:
                        return {"error": f"Cannot calculate mean on non-numeric column '{column}'."}
                elif strategy == "median":
                    if pd.api.types.is_numeric_dtype(df[column]):
                        val = df[column].median()
                    else:
                        return {"error": f"Cannot calculate median on non-numeric column '{column}'."}
                elif strategy == "mode":
                    modes = df[column].mode()
                    val = modes.iloc[0] if not modes.empty else None
                elif strategy == "value":
                    val = payload.get("fill_value")
                else:
                    return {"error": f"Unsupported imputation strategy: '{strategy}'."}
                
                df[column] = df[column].fillna(val)
                
            elif action == "cast":
                data_type = payload.get("data_type")
                if not data_type:
                    return {"error": "Missing 'data_type' parameter for type casting."}
                    
                if data_type == "int":
                    df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0).astype(int)
                elif data_type == "float":
                    df[column] = pd.to_numeric(df[column], errors='coerce').astype(float)
                elif data_type == "str":
                    df[column] = df[column].astype(str)
                elif data_type == "datetime":
                    df[column] = pd.to_datetime(df[column], errors='coerce')
                else:
                    return {"error": f"Unsupported cast target data type: '{data_type}'."}
                    
            elif action == "rename":
                new_name = payload.get("new_name")
                if not new_name:
                    return {"error": "Missing 'new_name' parameter for renaming."}
                if new_name in df.columns:
                    return {"error": f"Column '{new_name}' already exists."}
                df = df.rename(columns={column: new_name})
                
            elif action == "filter":
                # Filtering can be done on columns
                filter_col = payload.get("column")
                operator = payload.get("operator")
                value = payload.get("value")
                
                if not filter_col or not operator:
                    return {"error": "Missing 'column' or 'operator' parameters for filtering."}
                if filter_col not in df.columns:
                    return {"error": f"Column '{filter_col}' not found in the dataset."}
                    
                # Apply filter
                try:
                    # Cast filter comparison value if numeric
                    if pd.api.types.is_numeric_dtype(df[filter_col]):
                        value = float(value)
                        
                    if operator == "==":
                        df = df[df[filter_col] == value]
                    elif operator == "!=":
                        df = df[df[filter_col] != value]
                    elif operator == ">":
                        df = df[df[filter_col] > value]
                    elif operator == "<":
                        df = df[df[filter_col] < value]
                    elif operator == ">=":
                        df = df[df[filter_col] >= value]
                    elif operator == "<=":
                        df = df[df[filter_col] <= value]
                    elif operator == "contains":
                        df = df[df[filter_col].astype(str).str.contains(str(value), case=False, na=False)]
                    else:
                        return {"error": f"Unsupported operator '{operator}'."}
                except Exception as e:
                    return {"error": f"Failed to apply filter: {str(e)}"}
            else:
                return {"error": f"Unsupported transformation action: '{action}'."}
                
        # Save the updated dataframe
        save_to_cache(dataset_id, df, original_df, filename)
        
        # Recalculate analysis and return
        return analyze_dataframe(df, filename, dataset_id)
    except Exception as e:
        return {"error": f"Transformation failed: {str(e)}"}

@app.get("/api/export/{dataset_id}")
async def export_dataset(dataset_id: str, format: str = Query("csv")):
    cached = load_from_cache(dataset_id)
    if not cached:
        return {"error": "Dataset session not found or expired."}

    df, _, original_filename = cached
    base_name = os.path.splitext(original_filename)[0]

    format = format.lower()
    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        content = stream.getvalue()
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={base_name}_transformed.csv"}
        )
    elif format in ["xlsx", "excel"]:
        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Transformed Data")
        content = stream.getvalue()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={base_name}_transformed.xlsx"}
        )
    elif format == "json":
        content = df.to_json(orient="records", indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={base_name}_transformed.json"}
        )
    else:
        return {"error": f"Unsupported export format '{format}'. Use 'csv', 'xlsx', or 'json'."}

if __name__ == "__main__":
    import uvicorn
    # Use "main:app" for import string workers support
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)


