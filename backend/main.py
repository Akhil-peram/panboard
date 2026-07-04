from fastapi import FastAPI, UploadFile, File
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
        "https://panboard.akhil01011.workers.dev",
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
        "sample_data": sample_data
    }

@app.get("/")
async def root():
    return {"message": "Dashboard as a Service API is running"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Read the file content
        contents = await file.read()
        
        # Process based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
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

if __name__ == "__main__":
    import uvicorn
    # Use "main:app" for import string workers support
    uvicorn.run("main:app", host="0.0.0.0", port=8000, workers=4)

