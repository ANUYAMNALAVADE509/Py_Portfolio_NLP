from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Analysis"]
)


BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"


def read_csv(relative_path: str) -> pd.DataFrame:
    path = MODELS_DIR / relative_path

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Required model artifact not found: {relative_path}"
        )

    try:
        return pd.read_csv(path)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read {relative_path}: {exc}"
        )


def dataframe_to_records(df: pd.DataFrame):
    return df.where(pd.notnull(df), None).to_dict(orient="records")


@router.get("/portfolio-comparison")
def portfolio_comparison():
    df = read_csv("efficient_frontier/portfolio_comparison.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/portfolio-weights")
def portfolio_weights():
    df = read_csv("efficient_frontier/portfolio_weights.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/efficient-frontier")
def efficient_frontier():
    df = read_csv("efficient_frontier/efficient_frontier.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/random-portfolios")
def random_portfolios():
    df = read_csv("efficient_frontier/random_portfolios.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/stress-summary")
def stress_summary():
    df = read_csv("stress_testing/stress_summary.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/stress-contributors")
def stress_contributors():
    df = read_csv("stress_testing/top_stress_contributors.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/causal-beta")
def causal_beta():
    df = read_csv("stress_testing/latest_causal_beta.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/feature-importance")
def feature_importance():
    path = MODELS_DIR / "feature_importance.csv"

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="feature_importance.csv not found"
        )

    df = pd.read_csv(path)

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/volatility-predictions")
def volatility_predictions():
    df = read_csv("lstm_test_predictions.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/shap-global")
def shap_global():
    df = read_csv("shap/lstm_shap_global_importance.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/shap-signed")
def shap_signed():
    df = read_csv("shap/lstm_shap_mean_signed_contribution.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/shap-local")
def shap_local():
    df = read_csv("shap/lstm_shap_local_cases.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/lime-global")
def lime_global():
    df = read_csv("lime/lstm_lime_global_importance.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/lime-local")
def lime_local():
    df = read_csv("lime/lstm_lime_local_explanations.csv")

    return {
        "data": dataframe_to_records(df)
    }


@router.get("/model-results")
def model_results():
    path = MODELS_DIR / "model_results.csv"

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="model_results.csv not found"
        )

    df = pd.read_csv(path)

    return {
        "data": dataframe_to_records(df)
    }
