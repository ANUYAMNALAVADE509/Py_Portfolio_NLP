import os

import httpx


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "llama3.2:3b"
)

OLLAMA_TIMEOUT = float(
    os.getenv(
        "OLLAMA_TIMEOUT",
        "90"
    )
)


# ============================================================
# DEFAULT SYSTEM INSTRUCTION
# ============================================================

DEFAULT_SYSTEM_PROMPT = """
You are QuantRisk AI, a financial information assistant.

Answer the user's actual question directly.

For general financial education, use general financial
knowledge.

For current or recent financial claims, rely only on the
evidence supplied in the prompt.

Never invent current news, prices, dates, statistics,
announcements or citations.

Do not provide personalised buy or sell recommendations.

Be concise, factual and clear.

If evidence is insufficient for a current claim, say so.
""".strip()


# ============================================================
# GENERATE ANSWER
# ============================================================

async def generate_answer(
    prompt: str,
    system_prompt: str | None = None
) -> str:

    if not isinstance(
        prompt,
        str
    ) or not prompt.strip():

        raise ValueError(
            "The assistant prompt is empty."
        )

    payload = {

        "model": OLLAMA_MODEL,

        "system": (
            system_prompt
            or DEFAULT_SYSTEM_PROMPT
        ),

        "prompt": prompt,

        "stream": False,

        "keep_alive": "10m",

        "options": {

            # Keep answers reasonably short.
            # This is important for the local CPU model.
            "num_predict": 180,

            # Smaller context improves responsiveness
            # for this local model.
            "num_ctx": 2048,

            "temperature": 0.1
        }
    }

    endpoint = (
        f"{OLLAMA_URL.rstrip('/')}"
        "/api/generate"
    )

    try:

        timeout = httpx.Timeout(

            connect=10.0,

            read=OLLAMA_TIMEOUT,

            write=10.0,

            pool=10.0
        )

        async with httpx.AsyncClient(
            timeout=timeout
        ) as client:

            response = await client.post(
                endpoint,
                json=payload
            )

            response.raise_for_status()

            data = response.json()

    except httpx.ConnectError as error:

        raise RuntimeError(
            "Cannot connect to Ollama at "
            f"{OLLAMA_URL}. "
            "Make sure Ollama is running."
        ) from error

    except httpx.TimeoutException as error:

        raise RuntimeError(
            "Ollama did not respond within "
            f"{OLLAMA_TIMEOUT:.0f} seconds."
        ) from error

    except httpx.HTTPStatusError as error:

        raise RuntimeError(
            "Ollama returned HTTP "
            f"{error.response.status_code}: "
            f"{error.response.text[:500]}"
        ) from error

    except Exception as error:

        raise RuntimeError(
            f"Unexpected Ollama error: {error}"
        ) from error

    answer = data.get(
        "response",
        ""
    )

    if not isinstance(
        answer,
        str
    ):

        answer = str(answer)

    answer = answer.strip()

    if not answer:

        raise RuntimeError(
            "Ollama returned an empty answer."
        )

    return answer


# ============================================================
# OLLAMA HEALTH CHECK
# ============================================================

async def check_ollama() -> dict:

    endpoint = (
        f"{OLLAMA_URL.rstrip('/')}"
        "/api/tags"
    )

    try:

        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:

            response = await client.get(
                endpoint
            )

            response.raise_for_status()

            data = response.json()

        models = data.get(
            "models",
            []
        )

        model_names = {
            model.get("name")
            for model in models
            if isinstance(
                model,
                dict
            )
        }

        return {

            "available": True,

            "ollama_url": OLLAMA_URL,

            "configured_model": OLLAMA_MODEL,

            "model_available": (
                OLLAMA_MODEL
                in model_names
            ),

            "models": sorted(
                name
                for name in model_names
                if name
            )
        }

    except Exception as error:

        return {

            "available": False,

            "ollama_url": OLLAMA_URL,

            "configured_model": OLLAMA_MODEL,

            "model_available": False,

            "models": [],

            "error": str(error)
        }