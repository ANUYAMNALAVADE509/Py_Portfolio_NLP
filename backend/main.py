from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.nlp_routes import router as nlp_router


app = FastAPI(
    title="QuantRisk AI",
    description="AI-powered portfolio risk analysis with financial NLP intelligence.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    nlp_router,
    prefix="/api/nlp",
    tags=["NLP"],
)


@app.get("/")
def root():
    return {
        "message": "QuantRisk AI backend is running",
        "status": "success",
    }