"""
Symmetric encryption for sensitive credential fields stored in the DB.

Uses Fernet (AES-128-CBC + HMAC-SHA256).  The key lives in CREDENTIALS_KEY
(.env).  Any value that cannot be decrypted is returned as-is so existing
plaintext rows keep working until they're next saved.
"""
from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


@lru_cache(maxsize=1)
def _fernet() -> Fernet | None:
    from .config import get_settings
    key = (get_settings().CREDENTIALS_KEY or "").strip()
    if not key:
        return None
    return Fernet(key.encode())


def encrypt(value: str) -> str:
    """Encrypt a plaintext credential.  Returns value unchanged if no key set."""
    if not value:
        return value
    f = _fernet()
    if f is None:
        return value
    return f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    """Decrypt a credential.  Falls back to returning value as-is (plaintext legacy)."""
    if not value:
        return value
    f = _fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        # Value was stored before encryption was enabled — return plaintext
        return value
