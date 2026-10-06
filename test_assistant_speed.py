import asyncio
import time

from backend.assistant.retriever import (
    retrieve_financial_context,
    build_context,
)
from backend.assistant.llm import generate_answer


async def main():
    print("1. Starting retrieval...")

    start = time.perf_counter()

    articles = await retrieve_financial_context(
        "Explain beta in the stock market in simple terms.",
        ["RELIANCE.NS", "TCS.NS", "INFY.NS"],
    )

    retrieval_time = time.perf_counter() - start

    print("ARTICLES:", len(articles))
    print("RETRIEVAL TIME:", round(retrieval_time, 2), "seconds")

    context = build_context(articles)

    print("CONTEXT CHARACTERS:", len(context))

    prompt = f"""
Explain beta in the stock market in simple terms.

FINANCIAL EVIDENCE:
{context}
"""

    print("2. Sending full prompt to Ollama...")
    print("PROMPT CHARACTERS:", len(prompt))

    start = time.perf_counter()

    answer = await generate_answer(prompt)

    llm_time = time.perf_counter() - start

    print("LLM TIME:", round(llm_time, 2), "seconds")
    print()
    print("ANSWER:")
    print(answer)


if __name__ == "__main__":
    asyncio.run(main())