"""Shared LLM client factory — detects OpusMax keys by prefix."""
import os

OPUSMAX_BASE_URL = "https://api.opusmax.pro"
_OPUSMAX_PREFIX = "sk-ant-opm"


def make_client(api_key: str):
    """Return an anthropic.Anthropic client, using OpusMax proxy for opm keys."""
    from anthropic import Anthropic
    if api_key.startswith(_OPUSMAX_PREFIX):
        return Anthropic(api_key=api_key, base_url=OPUSMAX_BASE_URL)
    return Anthropic(api_key=api_key)


def resolve_system_key() -> str:
    """Return best available system API key: OPUSMAX → ANTHROPIC → CLAUDE alias."""
    return (
        os.getenv("OPUSMAX_API_KEY", "").strip()
        or os.getenv("ANTHROPIC_API_KEY", "").strip()
        or os.getenv("CLAUDE_API_KEY", "").strip()
    )


def extract_text(response) -> str:
    """Return text from the first text block — skips ThinkingBlocks from OpusMax."""
    for block in (response.content or []):
        if getattr(block, "type", "") == "text":
            return block.text
    raise ValueError(f"No text block in response. Block types: {[getattr(b,'type','?') for b in response.content]}")
