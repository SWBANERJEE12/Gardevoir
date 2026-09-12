import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.openai.com/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "gpt-4o-mini")
    SENTINEL_DB_PATH: str = os.getenv("SENTINEL_DB_PATH", "sentinel.db")
    CORS_ALLOW_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    DEMO_TARGET_BASE_URL: str = os.getenv("DEMO_TARGET_BASE_URL", "http://localhost:5001")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
