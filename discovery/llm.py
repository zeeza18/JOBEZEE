"""
Minimal LLM client supporting Gemini and OpenAI.

Usage:
    client = LLMClient.from_env()
    text   = client.ask("your prompt here")

Provider is chosen by which API key is present in the environment.
GEMINI_API_KEY takes precedence over OPENAI_API_KEY.
Override the model with the LLM_MODEL environment variable.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Literal

log = logging.getLogger(__name__)

Provider = Literal["gemini", "openai"]

_DEFAULT_MODELS: dict[str, str] = {
    "gemini": "gemini-2.0-flash",
    "openai": "gpt-4o-mini",
}


class LLMClient:
    """
    Thin wrapper around Gemini and OpenAI chat APIs.

    Provides a single `.ask(prompt)` method that returns a plain string,
    hiding all provider-specific boilerplate from callers.
    """

    def __init__(self, provider: Provider, api_key: str, model: str | None = None):
        self.provider = provider
        self.api_key  = api_key
        self.model    = model or _DEFAULT_MODELS[provider]
        log.debug("LLMClient ready: provider=%s model=%s", provider, self.model)

    # ------------------------------------------------------------------
    # Constructors
    # ------------------------------------------------------------------

    @classmethod
    def from_env(cls) -> "LLMClient":
        """
        Build a client from environment variables.

        Checks GEMINI_API_KEY first, then OPENAI_API_KEY.
        Respects LLM_MODEL to override the default model.

        Raises RuntimeError if no key is found.
        """
        model     = os.getenv("LLM_MODEL")
        gemini_k  = os.getenv("GEMINI_API_KEY")
        openai_k  = os.getenv("OPENAI_API_KEY")

        if gemini_k:
            log.debug("LLMClient: using Gemini")
            return cls("gemini", gemini_k, model)
        if openai_k:
            log.debug("LLMClient: using OpenAI")
            return cls("openai", openai_k, model)

        raise RuntimeError(
            "No LLM API key found in environment. "
            "Set GEMINI_API_KEY or OPENAI_API_KEY."
        )

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def ask(
        self,
        prompt: str,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        """Send a prompt and return the response text."""
        if self.provider == "gemini":
            return self._ask_gemini(prompt, temperature, max_tokens)
        return self._ask_openai(prompt, temperature, max_tokens)

    # ------------------------------------------------------------------
    # Provider implementations
    # ------------------------------------------------------------------

    def _ask_gemini(self, prompt: str, temperature: float, max_tokens: int) -> str:
        try:
            import google.generativeai as genai
        except ImportError:
            raise ImportError("Install google-generativeai: pip install google-generativeai")

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(
            self.model,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        t0 = time.perf_counter()
        response = model.generate_content(prompt)
        elapsed = time.perf_counter() - t0
        text = response.text
        log.debug(
            "Gemini: %.2fs | prompt=%d chars | response=%d chars",
            elapsed, len(prompt), len(text),
        )
        return text

    def _ask_openai(self, prompt: str, temperature: float, max_tokens: int) -> str:
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("Install openai: pip install openai")

        client = OpenAI(api_key=self.api_key)
        t0 = time.perf_counter()
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        elapsed = time.perf_counter() - t0
        text = response.choices[0].message.content or ""
        log.debug(
            "OpenAI: %.2fs | prompt=%d chars | response=%d chars",
            elapsed, len(prompt), len(text),
        )
        return text


# ------------------------------------------------------------------
# JSON extraction utility shared by all LLM callers
# ------------------------------------------------------------------

def extract_json(text: str) -> dict:
    """
    Parse JSON from an LLM response, handling common formatting noise.

    Strips:
    - <think>...</think> blocks (reasoning models)
    - ```json ... ``` code fences
    - Trailing partial JSON (attempts truncation recovery)
    """
    # Strip reasoning blocks
    if "<think>" in text:
        after = text.split("</think>")[-1].strip()
        if after:
            text = after

    # Strip code fences
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    text = text.strip()

    # Fix unescaped backslashes that are not valid JSON escapes
    text = re.sub(r'\\([^"\\\/bfnrtu])', r'\1', text)

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Truncation recovery: strip trailing chars until valid
    attempt = text
    while attempt and attempt[-1] in ('}', ']'):
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            attempt = attempt[:-1].rstrip()

    raise json.JSONDecodeError(
        "Could not parse JSON from LLM response", text, 0
    )
