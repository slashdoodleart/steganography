"""Utility helpers for optional payload encryption."""

from __future__ import annotations

import base64
import os

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_SALT_SIZE = 16
_ITERATIONS = 390000


def _derive_key(passphrase: str, salt: bytes) -> bytes:
    """Derive a Fernet key from a user passphrase and salt."""

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=_ITERATIONS)
    return base64.urlsafe_b64encode(kdf.derive(passphrase.encode("utf-8")))


def encrypt_message(message: bytes, passphrase: str) -> bytes:
    """Encrypt the payload, prefixing the salt for later recovery."""

    if not passphrase:
        return message
    salt = os.urandom(_SALT_SIZE)
    key = _derive_key(passphrase, salt)
    token = Fernet(key).encrypt(message)
    return salt + token


def decrypt_message(payload: bytes, passphrase: str) -> bytes:
    """Decrypt the payload and strip the prefixed salt."""

    if not passphrase:
        return payload
    if len(payload) <= _SALT_SIZE:
        raise ValueError("Encrypted payload is malformed")
    salt, token = payload[:_SALT_SIZE], payload[_SALT_SIZE:]
    key = _derive_key(passphrase, salt)
    try:
        return Fernet(key).decrypt(token)
    except InvalidToken as exc:
        raise ValueError("Invalid passphrase or corrupted payload") from exc
