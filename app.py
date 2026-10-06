from flask import (
    Flask,
    render_template,
    request,
    jsonify
)

from flask_cors import CORS

from services.news_service import get_finance_news
from services.ollama_service import ask_ollama
from services.vision_service import analyze_image


# ============================================================
# APPLICATION INITIALIZATION
# ============================================================

app = Flask(__name__)

# Allow requests from your frontend
CORS(app)


# ============================================================
# CONFIGURATION
# ============================================================

# Maximum uploaded image/file size = 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024


# ============================================================
# WEBSITE PAGES
# ============================================================

@app.route("/")
def home():
    """
    Main QuantRisk AI landing/introductory page.
    """

    return render_template("index.html")


@app.route("/login")
def login():
    """
    Login page.
    """

    return render_template("login.html")


@app.route("/register")
def register():
    """
    Registration page.
    """

    return render_template("register.html")


@app.route("/overview")
def overview():
    """
    Overview page.

    Currently uses index.html.
    You can later create overview.html if required.
    """

    return render_template("index.html")


@app.route("/assistant")
def assistant():
    """
    AI Assistant page.
    """

    return render_template("assistant.html")


@app.route("/profile")
def profile():
    """
    User profile page.
    """

    return render_template("profile.html")


# ============================================================
# TEAMMATE PLACEHOLDER PAGES
# ============================================================

@app.route("/dashboard")
def dashboard():
    """
    Portfolio Dashboard placeholder.

    This section is intentionally left for the
    teammate responsible for the Dashboard module.
    """

    return render_template("dashboard.html")


@app.route("/risk-analysis")
def risk_analysis():
    """
    ML Risk Analysis placeholder.

    This section is intentionally left for the
    teammate responsible for Risk Analysis.
    """

    return render_template("risk-analysis.html")


# ============================================================
# FINANCIAL NEWS API
# ============================================================

@app.route("/api/news", methods=["GET"])
def news_api():
    """
    Retrieve financial news.

    Example:
        /api/news

    Or:
        /api/news?topic=Reliance

    The actual news collection is handled by
    services.news_service.get_finance_news().
    """

    topic = request.args.get(
        "topic",
        "stocks OR portfolio OR financial markets"
    ).strip()

    # Prevent empty topic
    if not topic:
        topic = "stocks OR portfolio OR financial markets"

    try:

        articles = get_finance_news(topic)

        return jsonify({
            "success": True,
            "topic": topic,
            "articles": articles
        }), 200

    except Exception as exc:

        app.logger.exception(
            "Error while retrieving financial news"
        )

        return jsonify({
            "success": False,
            "error": "Unable to retrieve financial news.",
            "details": str(exc)
        }), 500


# ============================================================
# AI ASSISTANT CHAT API
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat_api():
    """
    AI Assistant endpoint.

    Expected JSON:

    {
        "question": "Why did NVIDIA fall today?"
    }
    """

    # Safely read JSON body
    data = request.get_json(
        silent=True
    ) or {}

    question = data.get(
        "question",
        ""
    )

    # Make sure question is a string
    if not isinstance(question, str):

        return jsonify({
            "success": False,
            "error": "Question must be text."
        }), 400

    question = question.strip()

    # Validate empty question
    if not question:

        return jsonify({
            "success": False,
            "error": "Please enter a question."
        }), 400

    try:

        result = ask_ollama(question)

        # Make sure result is a dictionary
        if not isinstance(result, dict):

            return jsonify({
                "success": False,
                "error": "Invalid response from AI service."
            }), 500

        answer = result.get(
            "answer",
            ""
        )

        sources = result.get(
            "sources",
            []
        )

        return jsonify({
            "success": True,
            "answer": answer,
            "sources": sources
        }), 200

    except Exception as exc:

        app.logger.exception(
            "Error while processing AI chat request"
        )

        return jsonify({
            "success": False,
            "error": "AI Assistant is currently unavailable.",
            "details": str(exc)
        }), 500


# ============================================================
# IMAGE ANALYSIS API
# ============================================================

@app.route(
    "/api/analyze-image",
    methods=["POST"]
)
def analyze_image_api():
    """
    Analyze an uploaded financial image.

    Expected multipart/form-data:

        image   -> uploaded image
        question -> optional question

    Example question:

        "What company is mentioned in this article?"

    Or:

        "Explain the portfolio shown in this image."
    """

    # --------------------------------------------------------
    # Check whether an image was uploaded
    # --------------------------------------------------------

    if "image" not in request.files:

        return jsonify({
            "success": False,
            "error": "No image was uploaded."
        }), 400

    image = request.files["image"]

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if image.filename == "":

        return jsonify({
            "success": False,
            "error": "Please select an image."
        }), 400

    # --------------------------------------------------------
    # Optional question
    # --------------------------------------------------------

    question = request.form.get(
        "question",
        "Analyze this financial image."
    ).strip()

    if not question:

        question = "Analyze this financial image."

    try:

        result = analyze_image(
            image,
            question
        )

        # Make sure the vision service returned
        # the expected dictionary
        if not isinstance(result, dict):

            return jsonify({
                "success": False,
                "error": "Invalid response from image analysis service."
            }), 500

        answer = result.get(
            "answer",
            ""
        )

        sources = result.get(
            "sources",
            []
        )

        return jsonify({
            "success": True,
            "answer": answer,
            "sources": sources
        }), 200

    except Exception as exc:

        app.logger.exception(
            "Error while analyzing uploaded image"
        )

        return jsonify({
            "success": False,
            "error": "Unable to analyze the uploaded image.",
            "details": str(exc)
        }), 500


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    """
    Basic backend health check.
    """

    return jsonify({
        "application": "Quant Risk AI",
        "status": "online"
    }), 200


# ============================================================
# 404 HANDLER
# ============================================================

@app.errorhandler(404)
def not_found(error):
    """
    Return JSON for unknown API routes.
    """

    if request.path.startswith("/api/"):

        return jsonify({
            "success": False,
            "error": "API endpoint not found."
        }), 404

    return (
        "<h1>404 - Page Not Found</h1>",
        404
    )


# ============================================================
# FILE TOO LARGE HANDLER
# ============================================================

@app.errorhandler(413)
def request_entity_too_large(error):

    return jsonify({
        "success": False,
        "error": "Uploaded file is too large. Maximum size is 10 MB."
    }), 413


# ============================================================
# APPLICATION ENTRY POINT
# ============================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )