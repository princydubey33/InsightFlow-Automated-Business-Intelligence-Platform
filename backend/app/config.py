import os
from pydantic_settings import BaseSettings

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB_PATH = os.path.join(BACKEND_DIR, "insightflow.db")
DEFAULT_UPLOADS_PATH = os.path.join(BACKEND_DIR, "uploads")

class Settings(BaseSettings):
    app_name: str = "InsightFlow API"
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    upload_dir: str = os.getenv("UPLOAD_DIR", DEFAULT_UPLOADS_PATH)
    ai_provider: str = os.getenv("AI_PROVIDER", "auto")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    ai_model: str = os.getenv("AI_MODEL", "")
    cors_origins: str = os.getenv("CORS_ORIGINS", "https://insightflow-automated-business-intelligence-platform.vercel.app,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173")
    
    # Email / SMTP
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from: str = os.getenv("SMTP_FROM", "noreply@insightflow.com")
    frontend_url: str = os.getenv("FRONTEND_URL", "https://insightflow-automated-business-intelligence-platform.vercel.app")
    
    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.upload_dir, exist_ok=True)
