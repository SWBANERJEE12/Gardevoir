import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.scans import router as scans_router
from api.demo import router as demo_router
from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("sentinel")

app = FastAPI(
    title="Sentinel Security API",
    description="AI-Powered Adversarial Health-Check Platform for Web Applications",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Open for local dev and demo frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scans_router)
app.include_router(demo_router)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "Sentinel Engine",
        "version": "1.0.0",
        "ai_analyst_configured": bool(settings.AI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
