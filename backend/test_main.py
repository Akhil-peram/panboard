import pytest
from fastapi.testclient import TestClient
from main import app
import io
import pandas as pd

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Dashboard as a Service API is running"}

def test_upload_csv():
    # Create a dummy CSV file
    data = "name,age\nAlice,30\nBob,25"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test.csv", file, "text/csv")}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["filename"] == "test.csv"
    assert "dataset_id" in json_response
    assert "columns" in json_response
    assert "row_count" in json_response
    assert json_response["row_count"] == 2
    assert "name" in json_response["columns"]
    assert "age" in json_response["columns"]

def test_upload_invalid_type():
    file = io.BytesIO(b"dummy content")
    
    response = client.post(
        "/api/upload",
        files={"file": ("test.txt", file, "text/plain")}
    )
    
    assert response.status_code == 200
    assert "error" in response.json()
    assert "Unsupported file type" in response.json()["error"]

def test_transform_impute():
    # Create CSV with missing numeric value
    data = "name,val\nAlice,10.0\nBob,\nCharlie,20.0"
    file = io.BytesIO(data.encode("utf-8"))
    
    # 1. Upload
    response = client.post(
        "/api/upload",
        files={"file": ("test_missing.csv", file, "text/csv")}
    )
    json_resp = response.json()
    dataset_id = json_resp["dataset_id"]
    assert json_resp["info"]["val"]["missing"] == 1
    
    # 2. Impute with mean (mean of 10 and 20 is 15)
    transform_resp = client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "impute", "column": "val", "strategy": "mean"}
    )
    assert transform_resp.status_code == 200
    transform_json = transform_resp.json()
    assert transform_json["info"]["val"]["missing"] == 0
    # Val for Bob should be 15, so sample data should show it
    records = transform_json["sample_data"]
    bob_record = next(r for r in records if r["name"] == "Bob")
    assert bob_record["val"] == 15.0

def test_transform_cast():
    data = "id,val\n1,10.5\n2,20.7"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test_cast.csv", file, "text/csv")}
    )
    dataset_id = response.json()["dataset_id"]
    
    # Cast val to int (10.5 -> 10, 20.7 -> 20)
    transform_resp = client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "cast", "column": "val", "data_type": "int"}
    )
    assert transform_resp.status_code == 200
    transform_json = transform_resp.json()
    assert "int" in transform_json["info"]["val"]["type"]
    
    records = transform_json["sample_data"]
    assert records[0]["val"] == 10
    assert records[1]["val"] == 20

def test_transform_rename():
    data = "name,val\nAlice,10\nBob,20"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test_rename.csv", file, "text/csv")}
    )
    dataset_id = response.json()["dataset_id"]
    
    # Rename column "val" to "score"
    transform_resp = client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "rename", "column": "val", "new_name": "score"}
    )
    assert transform_resp.status_code == 200
    transform_json = transform_resp.json()
    assert "score" in transform_json["columns"]
    assert "val" not in transform_json["columns"]
    
    records = transform_json["sample_data"]
    assert records[0]["score"] == 10

def test_transform_filter():
    data = "name,age\nAlice,30\nBob,25\nCharlie,35"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test_filter.csv", file, "text/csv")}
    )
    dataset_id = response.json()["dataset_id"]
    
    # Filter age > 28 (leaves Alice and Charlie, row_count should be 2)
    transform_resp = client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "filter", "column": "age", "operator": ">", "value": "28"}
    )
    assert transform_resp.status_code == 200
    transform_json = transform_resp.json()
    assert transform_json["row_count"] == 2
    
    names = [r["name"] for r in transform_json["sample_data"]]
    assert "Alice" in names
    assert "Charlie" in names
    assert "Bob" not in names

def test_transform_reset():
    data = "name,age\nAlice,30\nBob,25"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test_reset.csv", file, "text/csv")}
    )
    dataset_id = response.json()["dataset_id"]
    
    # Filter age > 28 (leaves only Alice)
    client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "filter", "column": "age", "operator": ">", "value": "28"}
    )
    
    # Reset
    reset_resp = client.post(
        f"/api/transform/{dataset_id}",
        json={"action": "reset"}
    )
    assert reset_resp.status_code == 200
    reset_json = reset_resp.json()
    assert reset_json["row_count"] == 2

def test_upload_xlsx():
    # Create a dummy DataFrame and write it to Excel xlsx format in memory
    df_data = pd.DataFrame({"name": ["Alice", "Bob"], "age": [30, 25]})
    file_buf = io.BytesIO()
    df_data.to_excel(file_buf, index=False)
    file_buf.seek(0)
    
    response = client.post(
        "/api/upload",
        files={"file": ("test.xlsx", file_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert "error" not in json_response
    assert json_response["filename"] == "test.xlsx"
    assert json_response["row_count"] == 2
    assert "name" in json_response["columns"]
    assert "age" in json_response["columns"]

def test_upload_xls_mocked():
    from unittest.mock import patch
    with patch("main.pd.read_excel") as mock_read_excel:
        mock_read_excel.return_value = pd.DataFrame({"name": ["Alice"], "age": [30]})
        
        response = client.post(
            "/api/upload",
            files={"file": ("test.xls", io.BytesIO(b"dummy xls"), "application/vnd.ms-excel")}
        )
        
        assert response.status_code == 200
        json_response = response.json()
        assert "error" not in json_response
        assert json_response["filename"] == "test.xls"
        mock_read_excel.assert_called_once()

def test_upload_csv_case_insensitive():
    data = "name,age\nAlice,30"
    file = io.BytesIO(data.encode("utf-8"))
    
    response = client.post(
        "/api/upload",
        files={"file": ("test.CSV", file, "text/csv")}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert json_response["filename"] == "test.CSV"

def test_upload_xlsx_case_insensitive():
    df_data = pd.DataFrame({"name": ["Alice"], "age": [30]})
    file_buf = io.BytesIO()
    df_data.to_excel(file_buf, index=False)
    file_buf.seek(0)
    
    response = client.post(
        "/api/upload",
        files={"file": ("test.XLSX", file_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    
    assert response.status_code == 200
    json_response = response.json()
    assert "error" not in json_response
    assert json_response["filename"] == "test.XLSX"

def test_upload_xlsb_mocked():
    from unittest.mock import patch
    with patch("main.pd.read_excel") as mock_read_excel:
        mock_read_excel.return_value = pd.DataFrame({"name": ["Alice"], "age": [30]})
        
        response = client.post(
            "/api/upload",
            files={"file": ("test.xlsb", io.BytesIO(b"dummy xlsb"), "application/vnd.ms-excel.sheet.binary.macroEnabled.12")}
        )
        
        assert response.status_code == 200
        json_response = response.json()
        assert "error" not in json_response
        assert json_response["filename"] == "test.xlsb"
        mock_read_excel.assert_called_once()

def test_upload_ods_mocked():
    from unittest.mock import patch
    with patch("main.pd.read_excel") as mock_read_excel:
        mock_read_excel.return_value = pd.DataFrame({"name": ["Alice"], "age": [30]})
        
        response = client.post(
            "/api/upload",
            files={"file": ("test.ods", io.BytesIO(b"dummy ods"), "application/vnd.oasis.opendocument.spreadsheet")}
        )
        
        assert response.status_code == 200
        json_response = response.json()
        assert "error" not in json_response
        assert json_response["filename"] == "test.ods"
        mock_read_excel.assert_called_once()

def test_insights_and_export():
    data = "name,val\nAlice,10\nBob,1000\nCharlie,12\nDavid,11\nEve,"
    file = io.BytesIO(data.encode("utf-8"))
    
    upload_resp = client.post(
        "/api/upload",
        files={"file": ("dataset_test.csv", file, "text/csv")}
    )
    assert upload_resp.status_code == 200
    json_resp = upload_resp.json()
    assert "insights" in json_resp
    assert json_resp["insights"]["health_score"] >= 0
    assert len(json_resp["insights"]["items"]) > 0

    dataset_id = json_resp["dataset_id"]

    # Export CSV
    export_csv = client.get(f"/api/export/{dataset_id}?format=csv")
    assert export_csv.status_code == 200
    assert "text/csv" in export_csv.headers["content-type"]
    assert "Alice" in export_csv.text

    # Export JSON
    export_json = client.get(f"/api/export/{dataset_id}?format=json")
    assert export_json.status_code == 200
    assert "application/json" in export_json.headers["content-type"]

    # Export XLSX
    export_xlsx = client.get(f"/api/export/{dataset_id}?format=xlsx")
    assert export_xlsx.status_code == 200
    assert "spreadsheetml" in export_xlsx.headers["content-type"]

