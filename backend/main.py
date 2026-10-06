from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.assistant_routes import router as assistant_router
from backend.api.market_routes import router as market_router
from backend.api.nlp_routes import router as nlp_router
from backend.api.risk_routes import router as risk_router


app = FastAPI(
    title="QuantRisk AI",
    description="AI-powered portfolio risk analysis with financial NLP intelligence.",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

# AI Assistant
app.include_router(
    assistant_router,
    prefix="/api/assistant",
    tags=["AI Assistant"],
)


# NLP Intelligence
app.include_router(
    nlp_router,
    prefix="/api/nlp",
    tags=["NLP"],
)


# Market Data
#
# IMPORTANT:
# market_routes.py already contains:
# prefix="/api/market"
#
# Therefore DO NOT add another "/api" prefix here.
app.include_router(
    market_router,
)


# Risk Analysis
#
# risk_routes.py already contains:
# prefix="/api/risk"
#
# Therefore it is included without another prefix.
app.include_router(
    risk_router,
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "QuantRisk AI backend is running",
        "status": "success",
    }