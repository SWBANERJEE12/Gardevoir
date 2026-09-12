import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_API_KEY: str = os.getenv("AI_API_KEY", os.getenv("GROQ_API_KEY", ""))
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SENTINEL_DB_PATH: str = os.getenv("SENTINEL_DB_PATH", "sentinel.db")
    AUTH_DB_PATH: str = os.getenv("AUTH_DB_PATH", "gardevoir_users.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "gardevoir-local-dev-secret-change-me")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    API_PUBLIC_URL: str = os.getenv("API_PUBLIC_URL", "http://localhost:8000")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    CORS_ALLOW_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    DEMO_TARGET_BASE_URL: str = os.getenv("DEMO_TARGET_BASE_URL", "http://localhost:5001")

    @property
    def google_redirect_uri(self) -> str:
        return f"{self.API_PUBLIC_URL}/api/auth/google/callback"

    @property
    def github_redirect_uri(self) -> str:
        return f"{self.API_PUBLIC_URL}/api/auth/github/callback"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
