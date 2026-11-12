import json
from collections.abc import AsyncIterator

import httpx

from app.rag.prompt import build_prompt
from app.services.llm.base import ContextChunk, LLMProvider


class AnthropicLLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    async def stream_answer(
        self, question: str, context: list[ContextChunk]
    ) -> AsyncIterator[str]:
        prompt = build_prompt(question, context)
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": self.model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    event = json.loads(line[len("data: "):])
                    if event.get("type") == "content_block_delta":
                        yield event["delta"].get("text", "")
