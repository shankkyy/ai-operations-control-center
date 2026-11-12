import asyncio
from collections.abc import AsyncIterator

from app.services.llm.base import ContextChunk, LLMProvider

INSUFFICIENT_EVIDENCE = (
    "I don't have enough grounded evidence in the retrieved operational "
    "records to answer this confidently."
)


class MockLLMProvider(LLMProvider):
    """Extractive, deterministic: builds the answer only from retrieved chunks.

    Never invents facts — if there's no context, it says so. This keeps the
    groundedness/hallucination evals meaningful without a paid LLM.
    """

    async def stream_answer(
        self, question: str, context: list[ContextChunk]
    ) -> AsyncIterator[str]:
        text = self._build_answer(question, context)
        for word in text.split(" "):
            yield word + " "
            await asyncio.sleep(0)  # yield control so SSE actually streams

    def _build_answer(self, question: str, context: list[ContextChunk]) -> str:
        if not context:
            return INSUFFICIENT_EVIDENCE

        lead = f"Based on {len(context)} retrieved operational record(s):"
        lines = []
        for chunk in context:
            excerpt = chunk.content.strip().replace("\n", " ")[:220]
            lines.append(f"- ({chunk.title}) {excerpt}")
        return lead + "\n" + "\n".join(lines)
