import asyncio
import time

from backend.assistant.llm import generate_answer


async def main():
    fake_context = """
SOURCE 1
Title:
Reliance Industries market update

Publisher:
Test Financial Source

Published:
2026-10-05

Summary:
This is test financial evidence about Reliance Industries.
""" * 40

    prompt = f"""
Explain beta in the stock market in simple terms.

FINANCIAL EVIDENCE:
{fake_context}
"""

    print("PROMPT CHARACTERS:", len(prompt))
    print("Sending request to Ollama...")

    start = time.perf_counter()

    try:
        answer = await generate_answer(prompt)

        elapsed = time.perf_counter() - start

        print("LLM TIME:", round(elapsed, 2), "seconds")
        print()
        print("ANSWER:")
        print(answer)

    except Exception as exc:
        elapsed = time.perf_counter() - start

        print("FAILED AFTER:", round(elapsed, 2), "seconds")
        print("ERROR:", exc)


if __name__ == "__main__":
    asyncio.run(main())