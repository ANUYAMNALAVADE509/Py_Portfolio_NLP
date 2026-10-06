## QUANTRISK AI

**AI-Powered Portfolio Risk Analysis with Financial NLP Intelligence**

QUANTRISK AI is a full-stack financial analytics web application designed to combine portfolio risk analysis, market data, machine-learning-based risk modelling, explainable AI, financial NLP, stress testing, and an AI assistant in a single interface.

The application provides authenticated users with portfolio-oriented analytics, risk metrics, model outputs, financial-news intelligence, market information, and an AI assistant for interacting with the available financial context.

---

## Project Overview

QUANTRISK AI combines:

- Portfolio and risk analytics
- Market-data integration
- Financial NLP intelligence
- Machine-learning risk modelling
- LSTM volatility forecasting
- SHAP and LIME explainability
- Portfolio stress testing
- Efficient-frontier analysis
- AI-assisted financial querying
- Firebase authentication
- Interactive React-based dashboards

The project contains both the application layer and the research/model-development notebooks used to generate and analyze the model outputs consumed by the backend.

---

## Main Application Areas

### Authentication

The frontend includes:

- Login
- Registration
- Google authentication
- Password reset
- Protected application routes
- Firebase-authenticated user profile

### Overview

The application provides an overview-oriented entry point for the authenticated user.

### Dashboard & Portfolio

The dashboard combines portfolio-oriented information with market and model-derived information, including:

- Market quotes
- Portfolio information
- Portfolio comparison
- Portfolio weights
- Risk-related model outputs
- Stress-testing information

### Risk Analysis

The Risk Analysis area exposes the project's available risk-model and explainability outputs, including:

- Portfolio comparison
- Portfolio weights
- Efficient frontier
- Random portfolios
- Stress-testing results
- Causal beta
- Feature importance
- Volatility predictions
- SHAP analysis
- LIME analysis
- Model results

###The NLP Intelligence 
Module provides a financial-news analysis layer for QuantRisk AI. It collects relevant stock/company news and applies Natural Language Processing to extract useful signals from the available articles.
Identifies:
- Sentiment
- Relevant financial topics
- Companies/entities mentioned in the article
- Risk-related terms and signals
- Financial events
- Potential impact
- Article relevance
Provides company-level summaries and highlights positive/risk-related news.
Uses article freshness and relevance when determining the usefulness of retrieved news.
Presents analyzed financial information in a structured interface for easier interpretation.

Key Functions
Retrieves relevant financial news for selected portfolio/company symbols.
Analyzes news articles using FinBERT-based financial sentiment analysis.

Purpose :
NLP Intelligence helps convert unstructured financial news into structured, interpretable information that can support portfolio monitoring and financial research.
### AI Assistant

The AI Assistant is the conversational intelligence layer of QuantRisk AI. It allows users to interact with the system using natural-language questions rather than predefined commands.

Key Functions
- Answers general financial and investment-related questions.
Handles questions about:
- Stocks and companies
- Market news
- Financial concepts
- Portfolio-related information
- Risk concepts
- Market developments
Identifies the type of question being asked and retrieves relevant financial evidence when current information is required.
Uses retrieved news and financial evidence to generate responses.
Provides source citations for retrieved current-news information.
Distinguishes available evidence from interpretation and avoids presenting unsupported information as fact.
Uses conversation history where provided to maintain context between questions.
Runs through the application's FastAPI backend and local Ollama LLM rather than exposing an LLM/API key directly in the frontend.

Purpose

The AI Assistant acts as an interactive financial research and explanation interface, allowing users to ask questions naturally and receive concise, evidence-supported responses.

---

## Technology Stack

### Frontend

- React
- Vite
- React Router
- Firebase Authentication
- Lucide React
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- Financial NLP pipeline
- Machine-learning model artifacts
- Market-data integration through yfinance

### Data Science / Machine Learning

The project includes:

- Feature engineering
- Machine-learning risk modelling
- LSTM volatility forecasting
- SHAP explainability
- LIME explainability
- Stress testing
- Efficient-frontier analysis
- Portfolio optimization analysis


## Backend Setup

Open PowerShell in the project root:

cd C:\Users\Nalavade\PycharmProjects\Py_Portfolio_NLP

Create a virtual environment if one does not already exist:

python -m venv .venv

Activate it:

.\.venv\Scripts\Activate.ps1

Install backend dependencies:

pip install -r backend\requirements.txt

Start the FastAPI backend:

uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

The backend will be available at:

http://127.0.0.1:8000

FastAPI's interactive API documentation is available at:

http://127.0.0.1:8000/docs

Frontend Setup

Open another PowerShell terminal:

cd C:\Users\Nalavade\PycharmProjects\Py_Portfolio_NLP\frontend

Install frontend dependencies:

npm install

Start the Vite development server:

npm run dev

The frontend is configured to run on:

http://127.0.0.1:5173

The Vite development server proxies /api requests to:

http://127.0.0.1:8000

Environment Variables

Environment files containing credentials or project-specific secrets are intentionally excluded from Git.

For Firebase configuration, the frontend uses Vite environment variables such as:

VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

Create the required local environment file on your own machine.
Authentication

The application uses Firebase Authentication for user authentication.

The frontend authentication layer includes:

Email/password login
Registration
Google sign-in
Password reset
Authentication-state observation
Protected routes
User profile information

Firebase configuration must be supplied through local environment variables.

Development Workflow

Backend:

.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

Frontend:

cd frontend
npm run dev

Testing

The repository contains project tests under:

tests/

Additional assistant-related test scripts are located at the project root:

test_assistant_speed.py
test_ollama_context.py

Run the Python test suite with:

pytest

Research Notebooks

The project includes notebooks covering the major data-science stages:

Data collection and preprocessing
Exploratory data analysis
Machine-learning risk modelling
LSTM volatility forecasting
SHAP explainability
LIME explainability
Stress testing
Efficient-frontier analysis

The notebooks are retained as research and reproducibility material.

Application-facing generated model artifacts are stored under backend/models/.
Git and Secret Management

The repository intentionally ignores:

Python virtual environments
node_modules
build directories
.env files
Firebase service-account credentials
private keys
PyCharm metadata
VS Code metadata
Jupyter checkpoints
temporary/cache files
duplicate generated model artifacts

The actual application model outputs required by the backend remain version-controlled under:

backend/models/
Market Data Disclaimer

Market information displayed by the application is dependent on the configured market-data provider and its availability.

Market data retrieved through yfinance should be treated as provider-supplied market information and may be delayed or subject to provider limitations. It should not automatically be interpreted as official exchange real-time data.

Model-generated risk metrics and forecasts are analytical outputs and should not be interpreted as guaranteed predictions or investment advice.

Project Status

QUANTRISK AI is an actively developed academic/project application combining financial analytics, machine learning, NLP, explainability, and an interactive web interface.

The repository contains both application code and supporting research/model artifacts required for the current implementation.

License

This project is currently maintained as an academic/project implementation. No separate open-source license has been specified.
