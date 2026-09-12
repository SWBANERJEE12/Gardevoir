import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.scans import router as scans_router
from api.demo import router as demo_router
from api.auth import router as auth_router
from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gardevoir")

app = FastAPI(
    title="Gardevoir Security API",
    description="AI-Powered Adversarial Health-Check Platform for Web Applications",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(scans_router)
app.include_router(demo_router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Gardevoir Engine",
        "version": "1.0.0",
        "ai_analyst_configured": bool(settings.AI_API_KEY),
        "auth": {
            "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "github": bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
        },
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
