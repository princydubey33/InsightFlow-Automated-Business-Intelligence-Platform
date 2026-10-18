import os
import io
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.user import User
from backend.app.models.dataset import Dataset
from backend.app.models.activity import ActivityLog
from backend.app.services.analytics_service import generate_analytics
from backend.app.services.dataset_service import apply_fix, generate_quality_report
from backend.app.services.insights_service import generate_insights
from backend.app.services.report_service import generate_report
from backend.app.config import settings

# In-memory SQLite for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db(tmp_path):
    Base.metadata.create_all(bind=engine)
    # Redirect upload dir to tmp_path
    original_upload_dir = settings.upload_dir
    settings.upload_dir = str(tmp_path)
    
    yield
    
    Base.metadata.drop_all(bind=engine)
    settings.upload_dir = original_upload_dir


class TestDataCleaningAndFixes:
    def test_duplicate_removal_and_metadata_sync(self, tmp_path):
        """Verify that duplicate rows are dropped and database row count is updated."""
        csv_file = tmp_path / "test_dups.csv"
        df = pd.DataFrame({
            "order_id": [101, 102, 102, 103, 103],
            "revenue": [500, 300, 300, 700, 700],
            "product": ["Widget A", "Widget B", "Widget B", "Widget C", "Widget C"]
        })
        df.to_csv(csv_file, index=False)

        # Upload via client
        with open(csv_file, "rb") as f:
            res = client.post(
                "/api/upload",
                files={"file": ("test_dups.csv", f, "text/csv")},
                headers={"X-User-Id": "1"}
            )
        assert res.status_code == 200
        ds_id = res.json()["id"]
        assert res.json()["row_count"] == 5

        # Check quality report detects duplicate rows
        q_res = client.get(f"/api/datasets/{ds_id}/quality", headers={"X-User-Id": "1"})
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert q_data["duplicate_rows"] == 2

        # Apply Duplicate Rows fix
        fix_res = client.post(
            f"/api/datasets/{ds_id}/fix",
            json={"issue_id": "duplicates_all", "issue_type": "Duplicate Rows", "column": "All"},
            headers={"X-User-Id": "1"}
        )
        assert fix_res.status_code == 200
        assert fix_res.json()["success"] is True

        # Verify dataset metadata in DB now shows 3 rows instead of 5
        updated_ds = client.get(f"/api/datasets/{ds_id}", headers={"X-User-Id": "1"}).json()
        assert updated_ds["row_count"] == 3

        # Verify quality report now has 0 duplicate rows
        q_after = client.get(f"/api/datasets/{ds_id}/quality", headers={"X-User-Id": "1"}).json()
        assert q_after["duplicate_rows"] == 0

    def test_missing_values_imputation(self, tmp_path):
        """Verify numeric missing values are imputed with mean and categorical with mode."""
        csv_file = tmp_path / "test_missing.csv"
        df = pd.DataFrame({
            "revenue": [100.0, 200.0, None, 400.0],  # Mean = 233.33
            "category": ["Electronics", "Electronics", None, "Books"]  # Mode = Electronics
        })
        df.to_csv(csv_file, index=False)

        with open(csv_file, "rb") as f:
            res = client.post(
                "/api/upload",
                files={"file": ("test_missing.csv", f, "text/csv")},
                headers={"X-User-Id": "1"}
            )
        ds_id = res.json()["id"]

        # Fix numeric column
        res_num = client.post(
            f"/api/datasets/{ds_id}/fix",
            json={"issue_id": "missing_revenue", "issue_type": "Missing Values", "column": "revenue"},
            headers={"X-User-Id": "1"}
        )
        assert res_num.status_code == 200
        assert res_num.json()["success"] is True

        # Fix categorical column
        res_cat = client.post(
            f"/api/datasets/{ds_id}/fix",
            json={"issue_id": "missing_category", "issue_type": "Missing Values", "column": "category"},
            headers={"X-User-Id": "1"}
        )
        assert res_cat.status_code == 200
        assert res_cat.json()["success"] is True

        # Check updated quality report
        q_after = client.get(f"/api/datasets/{ds_id}/quality", headers={"X-User-Id": "1"}).json()
        assert q_after["missing_values"] == 0

    def test_outlier_capping(self, tmp_path):
        """Verify outlier capping using IQR method."""
        csv_file = str(tmp_path / "test_outliers.csv")
        # 10 values around 10, plus one massive outlier of 1000
        vals = [10.0, 10.2, 10.1, 9.9, 10.3, 10.0, 9.8, 10.1, 10.2, 1000.0]
        df = pd.DataFrame({"price": vals})
        df.to_csv(csv_file, index=False)

        generate_quality_report(df, csv_file)
        success = apply_fix(csv_file, "text/csv", "outlier_price", "Outliers", "price")
        assert success is True

        df_fixed = pd.read_csv(csv_file)
        # Outlier should be capped far below 1000
        assert df_fixed["price"].max() < 20.0


class TestUserIsolationAndAuthorization:
    def test_user_cannot_access_or_modify_other_users_dataset(self, tmp_path):
        """User 2 must be rejected with 403 Forbidden when trying to access User 1's dataset."""
        csv_file = tmp_path / "user1_data.csv"
        pd.DataFrame({"x": [1, 2, 3]}).to_csv(csv_file, index=False)

        # Upload as User 1
        with open(csv_file, "rb") as f:
            res = client.post(
                "/api/upload",
                files={"file": ("user1_data.csv", f, "text/csv")},
                headers={"X-User-Id": "1"}
            )
        assert res.status_code == 200
        ds_id = res.json()["id"]

        # User 1 has access
        assert client.get(f"/api/datasets/{ds_id}", headers={"X-User-Id": "1"}).status_code == 200
        assert client.get(f"/api/datasets/{ds_id}/quality", headers={"X-User-Id": "1"}).status_code == 200
        assert client.get(f"/api/datasets/{ds_id}/analytics", headers={"X-User-Id": "1"}).status_code == 200
        assert client.get(f"/api/datasets/{ds_id}/insights", headers={"X-User-Id": "1"}).status_code == 200
        assert client.get(f"/api/datasets/{ds_id}/report", headers={"X-User-Id": "1"}).status_code == 200

        # User 2 receives 403 Forbidden across all endpoints
        headers_u2 = {"X-User-Id": "2"}
        assert client.get(f"/api/datasets/{ds_id}", headers=headers_u2).status_code == 403
        assert client.get(f"/api/datasets/{ds_id}/quality", headers=headers_u2).status_code == 403
        assert client.get(f"/api/datasets/{ds_id}/analytics", headers=headers_u2).status_code == 403
        assert client.get(f"/api/datasets/{ds_id}/insights", headers=headers_u2).status_code == 403
        assert client.get(f"/api/datasets/{ds_id}/report", headers=headers_u2).status_code == 403
        assert client.post(f"/api/datasets/{ds_id}/ask", json={"question": "count"}, headers=headers_u2).status_code == 403
        assert client.post(f"/api/datasets/{ds_id}/fix", json={"issue_id": "1", "issue_type": "Duplicate Rows", "column": "All"}, headers=headers_u2).status_code == 403
        assert client.delete(f"/api/datasets/{ds_id}", headers=headers_u2).status_code == 403

        # Unauthenticated request also receives 403 Forbidden
        assert client.get(f"/api/datasets/{ds_id}").status_code == 403
        assert client.delete(f"/api/datasets/{ds_id}").status_code == 403

    def test_datasets_list_and_history_scoped_to_user(self, tmp_path):
        """GET /api/datasets and /api/history only return items belonging to current user."""
        csv1 = tmp_path / "u1.csv"
        csv2 = tmp_path / "u2.csv"
        pd.DataFrame({"a": [1]}).to_csv(csv1, index=False)
        pd.DataFrame({"b": [2]}).to_csv(csv2, index=False)

        with open(csv1, "rb") as f:
            client.post("/api/upload", files={"file": ("u1.csv", f, "text/csv")}, headers={"X-User-Id": "10"})
        with open(csv2, "rb") as f:
            client.post("/api/upload", files={"file": ("u2.csv", f, "text/csv")}, headers={"X-User-Id": "20"})

        # User 10 only sees u1.csv
        u10_datasets = client.get("/api/datasets", headers={"X-User-Id": "10"}).json()
        assert len(u10_datasets) == 1
        assert u10_datasets[0]["original_filename"] == "u1.csv"

        # User 20 only sees u2.csv
        u20_datasets = client.get("/api/datasets", headers={"X-User-Id": "20"}).json()
        assert len(u20_datasets) == 1
        assert u20_datasets[0]["original_filename"] == "u2.csv"

        # History activities also strictly scoped
        u10_acts = client.get("/api/history/activities", headers={"X-User-Id": "10"}).json()
        assert all(a["dataset_filename"] == "u1.csv" for a in u10_acts)

        u20_acts = client.get("/api/history/activities", headers={"X-User-Id": "20"}).json()
        assert all(a["dataset_filename"] == "u2.csv" for a in u20_acts)


class TestAnalyticsAndInsightsCalculations:
    def test_analytics_calculations_with_returns_and_refunds(self, tmp_path):
        """Analytics should properly separate valid gross sales from returns and negative refunds."""
        csv_file = str(tmp_path / "ecommerce.csv")
        df = pd.DataFrame({
            "order_id": [1, 2, 3, 4, 5],
            "revenue": [1000.0, 500.0, 1500.0, -200.0, 800.0],  # row 4 is a refund (-200)
            "quantity": [2, 1, 3, -1, 2],
            "return": ["no", "no", "yes", "no", "no"],          # row 3 is a return
            "product": ["Phone", "Case", "Laptop", "Cable", "Headphones"],
            "category": ["Tech", "Tech", "Tech", "Accessory", "Audio"],
            "city": ["Mumbai", "Delhi", "Bengaluru", "Mumbai", "Pune"],
            "date": ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05"]
        })
        df.to_csv(csv_file, index=False)

        analytics = generate_analytics(csv_file, "text/csv")

        # Valid sales rows: row 1 (1000), row 2 (500), row 5 (800)
        # Gross revenue = 1000 + 500 + 800 = 2300.0
        assert analytics["totalRevenue"] == 2300.0
        # Valid orders count = 3
        assert analytics["totalOrders"] == 3
        # Average Order Value = 2300 / 3 = 766.666...
        assert round(analytics["averageOrderValue"], 2) == round(2300.0 / 3, 2)
        # Total returns = 1
        assert analytics["totalReturns"] == 1
        # Total refunds = 1
        assert analytics["totalRefunds"] == 1

        # Check rankings
        top_prod_names = [p["name"] for p in analytics["top5Products"]]
        assert "Phone" in top_prod_names
        assert "Laptop" not in top_prod_names # Laptop was marked returned!

    def test_dynamic_city_label_in_insights_and_reports(self, tmp_path):
        """Insights and Reports should adapt label to Region when region column is present."""
        csv_file = str(tmp_path / "regions.csv")
        df = pd.DataFrame({
            "revenue": [1000, 2000, 3000],
            "orders": [1, 2, 3],
            "region": ["North America", "Europe", "Asia-Pacific"]
        })
        df.to_csv(csv_file, index=False)

        analytics = generate_analytics(csv_file, "text/csv")
        assert analytics["cityLabel"] == "Regions"

        insights = generate_insights(csv_file, "text/csv")
        region_insight = next((i for i in insights if "Region" in i["title"]), None)
        assert region_insight is not None
        assert "Top Regions by Revenue" in region_insight["title"]
