"""
LLM provider abstraction so the rest of the app (service.py) doesn't care whether
generation runs on Gemini or OpenAI. Selected at call time via settings.LLM_PROVIDER.
"""
import json
from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)


class LLMProvider(ABC):
    @abstractmethod
    async def generate_structured(self, prompt: str, schema: type[T]) -> T:
        """Call the LLM and return a validated instance of `schema`."""


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from google import genai

        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def generate_structured(self, prompt: str, schema: type[T]) -> T:
        from google.genai import types

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        if response.parsed is not None:
            return response.parsed
        return schema.model_validate_json(response.text)


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_structured(self, prompt: str, schema: type[T]) -> T:
        schema_hint = json.dumps(schema.model_json_schema())
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You output only valid JSON matching this JSON schema, with no "
                        f"markdown fences or commentary: {schema_hint}"
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        return schema.model_validate_json(content)


def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.LLM_PROVIDER == "gemini":
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
    if settings.LLM_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set in backend/.env")
        return OpenAIProvider(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL)
    raise RuntimeError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER!r} (expected 'gemini' or 'openai')")
