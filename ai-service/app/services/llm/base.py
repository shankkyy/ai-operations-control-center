from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class ContextChunk:
    chunk_id: str
    document_id: str
    title: str
    content: str
    similarity: float


class LLMProvider(ABC):
    @abstractmethod
    def stream_answer(
        self, question: str, context: list[ContextChunk]
    ) -> AsyncIterator[str]: ...

    async def generate(self, question: str, context: list[ContextChunk]) -> str:
        parts = [chunk async for chunk in self.stream_answer(question, context)]
        return "".join(parts)
