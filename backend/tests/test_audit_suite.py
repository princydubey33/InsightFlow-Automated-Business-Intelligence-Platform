import os
import io
import json
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from unittest.mock import patch, MagicMock

from backend.app.main import app, ensure_schema_migrations
from backend.app.database import Base, get_db
from backend.app.models.user import User
from backend.app.models.dataset import Dataset
from backend.app.models.activity import ActivityLog
from backend.app.services.analytics_service import generate_analytics
from backend.app.services.dataset_service import apply_fix, generate_quality_report
from backend.app.services.insights_service import generate_insights
from backend.app.services.report_service import generate_report
from backend.app.services.ai_service import get_ai_credentials, answer_dataset_question, execute_pandas_code
from backend.app.config import settings, normalize_database_url

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


class TestDatabasePersistenceAndPostgresCompatibility:
    def test_normalize_database_url_postgresql_formats(self):
        """Render supplies postgres:// which must be normalized to postgresql+psycopg2://."""
        raw_render_url = "postgres://insightflow_user:secret_pass@dpg-abc1234-a.render.com/insightflow_db"
        normalized = normalize_database_url(raw_render_url)
        assert normalized == "postgresql://insightflow_user:secret_pass@dpg-abc1234-a.render.com/insightflow_db"

        raw_std_url = "postgresql://user:pass@localhost:5432/db"
        assert normalize_database_url(raw_std_url) == "postgresql://user:pass@localhost:5432/db"

        sqlite_url = "sqlite:///path/to/insightflow.db"
        assert normalize_database_url(sqlite_url) == "sqlite:///path/to/insightflow.db"

    def test_database_persistence_across_sessions(self, tmp_path):
        """Verify user accounts, datasets, and activity logs persist across separate session connections."""
        test_db_file = tmp_path / "persistent_test.db"
        db_url = f"sqlite:///{test_db_file}"
        test_engine = create_engine(db_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=test_engine)
        Session = sessionmaker(bind=test_engine)

        # Session 1: Create records
        sess1 = Session()
        user = User(name="Alice", email="alice@example.com", password="hashed_pw_123", role="Admin")
        sess1.add(user)
        sess1.commit()
        user_id = user.id

        dataset = Dataset(
            filename="sales_2026.csv",
            original_filename="Sales Data.csv",
            file_type="text/csv",
            file_size=1024,
            row_count=100,
            column_count=5,
            status="processed",
            user_id=user_id
        )
        sess1.add(dataset)
        sess1.commit()
        ds_id = dataset.id

        activity = ActivityLog(
            user_id=user_id,
            dataset_id=ds_id,
            dataset_filename="Sales Data.csv",
            activity_type="Analytics",
            status="success",
            summary_metrics=json.dumps({"revenue": 50000})
        )
        sess1.add(activity)
        sess1.commit()
        act_id = activity.id
        sess1.close()

        # Session 2: Connect fresh and verify complete persistence
        sess2 = Session()
        recovered_user = sess2.query(User).filter(User.id == user_id).first()
        assert recovered_user is not None
        assert recovered_user.email == "alice@example.com"
        assert recovered_user.role == "Admin"

        recovered_ds = sess2.query(Dataset).filter(Dataset.id == ds_id).first()
        assert recovered_ds is not None
        assert recovered_ds.original_filename == "Sales Data.csv"
        assert recovered_ds.user_id == user_id
        assert recovered_ds.row_count == 100

        recovered_act = sess2.query(ActivityLog).filter(ActivityLog.id == act_id).first()
        assert recovered_act is not None
        assert recovered_act.activity_type == "Analytics"
        assert json.loads(recovered_act.summary_metrics)["revenue"] == 50000
        sess2.close()

    def test_schema_migration_inspector(self):
        """ensure_schema_migrations should inspect existing tables and run cleanly without PRAGMA errors."""
        ensure_schema_migrations()

    def test_ensure_dataset_file_restores_from_db(self, tmp_path):
        """ensure_dataset_file automatically recovers the file onto disk from database base64 content if disk was wiped."""
        import base64
        from backend.app.routes.datasets import ensure_dataset_file
        from backend.app.config import settings

        raw_csv = "col_a,col_b\n1,2\n3,4\n"
        b64_str = base64.b64encode(raw_csv.encode("utf-8")).decode("utf-8")
        test_fn = "ephemeral_test.csv"
        ds = Dataset(id=88, filename=test_fn, original_filename="test.csv", file_type="text/csv", file_content=b64_str)

        with patch.object(settings, "upload_dir", str(tmp_path)):
            recovered_path = ensure_dataset_file(ds)
            assert os.path.exists(recovered_path)
            with open(recovered_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert content == raw_csv



class TestAIChatbotServiceAndProviderIntegration:
    def test_missing_api_key_returns_clear_guidance(self, tmp_path):
        """When no API key is configured, answer_dataset_question returns helpful Render setup guidance."""
        csv_file = tmp_path / "data.csv"
        pd.DataFrame({"x": [1, 2, 3]}).to_csv(csv_file, index=False)
        dataset = Dataset(id=1, filename="data.csv", original_filename="data.csv", file_type="text/csv", user_id=1)

        with patch.dict(os.environ, {}, clear=True):
            res = answer_dataset_question("How many rows are there?", dataset, str(csv_file))
            assert "AI Provider is not configured" in res["answer"]
            assert "GROQ_API_KEY" in res["answer"]
            assert "GEMINI_API_KEY" in res["answer"]
            assert "System Configuration Error" in res["sources"]

    def test_get_ai_credentials_provider_selection(self):
        """get_ai_credentials prioritizes configured provider and auto-detects keys."""
        with patch.dict(os.environ, {"AI_PROVIDER": "groq", "GROQ_API_KEY": "gsk_test123", "GEMINI_API_KEY": "AIzaSy_test"}):
            provider, key = get_ai_credentials()
            assert provider == "groq"
            assert key == "gsk_test123"

        with patch.dict(os.environ, {"AI_PROVIDER": "gemini", "GROQ_API_KEY": "gsk_test123", "GEMINI_API_KEY": "AIzaSy_test"}):
            provider, key = get_ai_credentials()
            assert provider == "gemini"
            assert key == "AIzaSy_test"

        # Auto detection with only Gemini
        with patch.dict(os.environ, {"AI_PROVIDER": "auto", "GROQ_API_KEY": "", "GEMINI_API_KEY": "AIzaSy_only", "OPENAI_API_KEY": ""}):
            provider, key = get_ai_credentials()
            assert provider == "gemini"
            assert key == "AIzaSy_only"

    def test_execute_pandas_code_sandbox(self):
        """execute_pandas_code safely executes Python/Pandas calculation and returns string output."""
        df = pd.DataFrame({"revenue": [100, 200, 300], "units": [2, 4, 6]})
        code = "print(df['revenue'].sum())"
        output = execute_pandas_code(code, df)
        assert output == "600"

        code_mean = "print(round(df['units'].mean(), 1))"
        output_mean = execute_pandas_code(code_mean, df)
        assert output_mean == "4.0"

    def test_answer_dataset_question_with_mocked_llm_and_history(self, tmp_path):
        """Verifies full question answering flow with history and LLM interaction."""
        csv_file = tmp_path / "mock_data.csv"
        pd.DataFrame({"price": [10, 20, 30]}).to_csv(csv_file, index=False)
        dataset = Dataset(id=99, filename="mock_data.csv", original_filename="mock_data.csv", file_type="text/csv", user_id=1)

        history = [
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hello! How can I help you analyze your data?"}
        ]

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_mock"}):
            with patch("backend.app.services.ai_service._call_llm_api") as mock_call:
                mock_call.return_value = "The total price sum is 60 across 3 items."
                res = answer_dataset_question("What is the sum of prices?", dataset, str(csv_file), history)
                
                assert res["dataset_id"] == 99
                assert "The total price sum is 60" in res["answer"]
                assert "InsightFlow AI (Groq)" in res["sources"]
                assert mock_call.called
                sent_messages = mock_call.call_args[0][0]
                roles = [m["role"] for m in sent_messages]
                assert roles[:4] == ["system", "user", "assistant", "user"]
                assert sent_messages[3]["content"] == "What is the sum of prices?"

    def test_gemini_payload_formatting(self):
        """Verifies Gemini request formats system prompt as system_instruction and alternates turns."""
        from backend.app.services.ai_service import _call_llm_api
        messages = [
            {"role": "system", "content": "You are a data assistant."},
            {"role": "user", "content": "First query"},
            {"role": "user", "content": "Second query concatenated"}
        ]
        with patch("httpx.Client.post") as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"candidates": [{"content": {"parts": [{"text": "Gemini response"}]}}]}
            )
            res = _call_llm_api(messages, "AIzaSy_fake", "gemini")
            assert res == "Gemini response"
            sent_payload = mock_post.call_args[1]["json"]
            assert "system_instruction" in sent_payload
            assert sent_payload["system_instruction"]["parts"][0]["text"] == "You are a data assistant."
            # The two user queries should have been merged into a single user turn
            assert len(sent_payload["contents"]) == 1
            assert sent_payload["contents"][0]["role"] == "user"
            assert "First query" in sent_payload["contents"][0]["parts"][0]["text"]
            assert "Second query concatenated" in sent_payload["contents"][0]["parts"][0]["text"]

    def test_groq_candidate_model_fallback_on_404(self):
        """When the primary Groq model returns 404, the client tries the next candidate model."""
        from backend.app.services.ai_service import _call_llm_api
        messages = [{"role": "user", "content": "hello"}]

        resp_404 = MagicMock(status_code=404, json=lambda: {"error": {"message": "The model 'llama-3.1-8b-instant' does not exist"}})
        resp_200 = MagicMock(status_code=200, json=lambda: {"choices": [{"message": {"content": "Groq fallback response"}}]})

        with patch("httpx.Client.post", side_effect=[resp_404, resp_200]) as mock_post:
            with patch.dict(os.environ, {"AI_MODEL": "llama-3.1-8b-instant"}):
                res = _call_llm_api(messages, "gsk_fake", "groq")
                assert res == "Groq fallback response"
                assert mock_post.call_count == 2

    def test_multi_provider_fallback_groq_to_gemini(self, tmp_path):
        """When Groq fails with an error and Gemini is configured, it automatically falls back to Gemini."""
        csv_file = tmp_path / "mock.csv"
        pd.DataFrame({"val": [10, 20]}).to_csv(csv_file, index=False)
        dataset = Dataset(id=10, filename="mock.csv", original_filename="mock.csv", file_type="text/csv", user_id=1)

        def mock_call_llm(messages, api_key, provider):
            if provider == "groq":
                raise Exception("Groq endpoint unreachable or model missing")
            elif provider == "gemini":
                return "Gemini answered your data question!"
            raise Exception("Unknown provider")

        with patch.dict(os.environ, {"GROQ_API_KEY": "gsk_broken", "GEMINI_API_KEY": "AIzaSy_working"}):
            with patch("backend.app.services.ai_service._call_llm_api", side_effect=mock_call_llm):
                res = answer_dataset_question("How many rows?", dataset, str(csv_file))
                assert "Gemini answered your data question!" in res["answer"]
                assert "InsightFlow AI (Gemini)" in res["sources"]

    def test_gemini_dynamic_model_extraction_on_404(self):
        """When Gemini returns a 404 suggesting a newer model, the client extracts it and retries."""
        from backend.app.services.ai_service import _call_llm_api
        messages = [{"role": "user", "content": "hello"}]

        resp_404 = MagicMock(status_code=404, json=lambda: {
            "error": {"message": "This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.8-flash"}
        })
        resp_200 = MagicMock(status_code=200, json=lambda: {
            "candidates": [{"content": {"parts": [{"text": "Gemini 3.8 response"}]}}]
        })

        with patch("httpx.Client.post", side_effect=[resp_404, resp_200]) as mock_post:
            with patch.dict(os.environ, {"AI_MODEL": "gemini-deprecated"}):
                res = _call_llm_api(messages, "AIzaSy_fake", "gemini")
                assert res == "Gemini 3.8 response"
                assert mock_post.call_count == 2



