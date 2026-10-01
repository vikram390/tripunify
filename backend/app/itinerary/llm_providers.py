"""
LLM provider abstraction so the rest of the app (service.py) doesn't care whether
generation runs on Gemini or OpenAI. Selected at call time via settings.LLM_PROVIDER.

Each provider has an ordered list of models: the configured primary model first, then
the fallbacks. Hosted models regularly return "503 high demand" for minutes at a time,
and which model is overloaded changes from minute to minute — so instead of retrying
the same busy model, `generate()` moves straight on to the next one.
"""
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# A single model gets this long to answer before we give up on it and try the next.
PER_MODEL_TIMEOUT_SECONDS = 75
# Stop starting new attempts after this long, so the user isn't left waiting for minutes.
TOTAL_BUDGET_SECONDS = 150
# If every model was busy, wait this long and go through the list once more.
SECOND_PASS_DELAY_SECONDS = 4


class LLMUnavailableError(Exception):
    """Every configured model failed (overloaded, rate-limited, timed out, or bad output)."""

    def __init__(self, attempts: list[str]):
        self.attempts = attempts
        super().__init__("; ".join(attempts))


def _short_error(exc: Exception) -> str:
    if isinstance(exc, asyncio.TimeoutError):
        return "timed out"
    text = str(exc) or type(exc).__name__
    return text.split(".")[0][:80]  # e.g. "503 UNAVAILABLE"


class LLMProvider(ABC):
    def __init__(self, models: list[str]):
        # De-duplicate while keeping order (the primary model might also be listed as a fallback).
        self.models = list(dict.fromkeys(m for m in models if m))

    @abstractmethod
    async def _generate_once(self, prompt: str, schema: type[T], model: str) -> T:
        """One call to one model, returning a validated instance of `schema`."""

    async def generate(self, prompt: str, schema: type[T]) -> tuple[T, str]:
        """Try each model in order; return (result, model_that_answered)."""
        attempts: list[str] = []
        deadline = time.monotonic() + TOTAL_BUDGET_SECONDS
        for pass_number in range(2):
            if pass_number == 1:
                await asyncio.sleep(SECOND_PASS_DELAY_SECONDS)
            for model in self.models:
                remaining = deadline - time.monotonic()
                if remaining <= 5:
                    raise LLMUnavailableError(attempts + ["gave up: time budget used"])
                try:
                    result = await asyncio.wait_for(
                        self._generate_once(prompt, schema, model),
                        timeout=min(PER_MODEL_TIMEOUT_SECONDS, remaining),
                    )
                    if attempts:
                        logger.info("LLM fallback: %s answered after %s", model, attempts)
                    return result, model
                except Exception as exc:  # overload, rate limit, timeout, malformed output, ...
                    attempts.append(f"{model}: {_short_error(exc)}")
                    logger.warning("LLM call to %s failed: %s", model, _short_error(exc))
        raise LLMUnavailableError(attempts)


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, models: list[str]):
        from google import genai
        from google.genai import types

        super().__init__(models)
        # The SDK's own retries (5 attempts with growing back-off) would keep hammering an
        # overloaded model for minutes — fail fast and let generate() switch models instead.
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=PER_MODEL_TIMEOUT_SECONDS * 1000,
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )

    async def _generate_once(self, prompt: str, schema: type[T], model: str) -> T:
        from google.genai import types

        response = await self._client.aio.models.generate_content(
            model=model,
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
    def __init__(self, api_key: str, models: list[str]):
        from openai import AsyncOpenAI

        super().__init__(models)
        self._client = AsyncOpenAI(api_key=api_key, max_retries=0, timeout=PER_MODEL_TIMEOUT_SECONDS)

    async def _generate_once(self, prompt: str, schema: type[T], model: str) -> T:
        schema_hint = json.dumps(schema.model_json_schema())
        response = await self._client.chat.completions.create(
            model=model,
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


def _model_list(primary: str, fallbacks: str) -> list[str]:
    return [primary.strip()] + [m.strip() for m in fallbacks.split(",") if m.strip()]


def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.LLM_PROVIDER == "gemini":
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            models=_model_list(settings.GEMINI_MODEL, settings.GEMINI_FALLBACK_MODELS),
        )
    if settings.LLM_PROVIDER == "openai":
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set in backend/.env")
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            models=_model_list(settings.OPENAI_MODEL, settings.OPENAI_FALLBACK_MODELS),
        )
    raise RuntimeError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER!r} (expected 'gemini' or 'openai')")
