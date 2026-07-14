"""Shared LLM client factory for the tailor pipeline."""
import os


def make_client(api_key: str):
    """Return an anthropic.Anthropic client."""
    from anthropic import Anthropic
    return Anthropic(api_key=api_key)


def resolve_system_key() -> str:
    """Return best available system API key: ANTHROPIC → CLAUDE alias."""
    return (
        os.getenv("ANTHROPIC_API_KEY", "").strip()
        or os.getenv("CLAUDE_API_KEY", "").strip()
    )


def extract_text(response) -> str:
    """Return text from the first text block."""
    for block in (response.content or []):
        if getattr(block, "type", "") == "text":
            return block.text
    raise ValueError(f"No text block in response. Block types: {[getattr(b,'type','?') for b in response.content]}")
