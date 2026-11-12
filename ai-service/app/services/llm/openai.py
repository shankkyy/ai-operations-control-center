import json
from collections.abc import AsyncIterator

import httpx

from app.rag.prompt import build_prompt
from app.services.llm.base import ContextChunk, LLMProvider


class OpenAILLMProvider(LLMProvider):
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
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[len("data: "):]
                    if payload == "[DONE]":
                        break
                    delta = json.loads(payload)["choices"][0]["delta"]
                    if "content" in delta:
                        yield delta["content"]
