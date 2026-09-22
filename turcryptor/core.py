"""
Turcryptor core — pure crypto logic, no UI.

Payload format (version TC1):

    TC1:<salt b64url>:<nonce b64url>:<ciphertext b64url>

Every payload carries its own random salt and nonce, so the same
message + password never produces the same output twice.
"""

import base64
import binascii
import secrets

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

VERSION = "TC1"

SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32

# Scrypt parameters: 32 MiB of memory per derivation.
SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1

# Base64 length of salt/nonce — lets us reject garbage payloads before
# paying for the expensive Scrypt derivation (fail fast).
_SALT_B64_LEN = 4 * ((SALT_SIZE + 2) // 3)    # 24
_NONCE_B64_LEN = 4 * ((NONCE_SIZE + 2) // 3)  # 16


class TurcryptorError(ValueError):
    """Wrong password or malformed/corrupted payload."""


def derive_key(password: str, salt: bytes) -> bytes:
    """Turn a password into a 256-bit key with Scrypt."""
    kdf = Scrypt(salt=salt, length=KEY_SIZE, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return kdf.derive(password.encode("utf-8"))


def encrypt_message(message: str, password: str) -> str:
    """Encrypt UTF-8 text with AES-256-GCM under a Scrypt-derived key."""
    salt = secrets.token_bytes(SALT_SIZE)
    nonce = secrets.token_bytes(NONCE_SIZE)
    key = derive_key(password, salt)

    ciphertext = AESGCM(key).encrypt(nonce, message.encode("utf-8"), None)

    return ":".join(
        (
            VERSION,
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(nonce).decode("ascii"),
            base64.urlsafe_b64encode(ciphertext).decode("ascii"),
        )
    )


def decrypt_message(token: str, password: str) -> str:
    """Decrypt a Turcryptor payload. Raises TurcryptorError on any failure."""
    parts = token.strip().split(":", 3)
    if len(parts) != 4 or parts[0] != VERSION:
        raise TurcryptorError("Not a valid Turcryptor payload.")

    salt_b64, nonce_b64, ciphertext_b64 = parts[1:]
    if (
        len(salt_b64) != _SALT_B64_LEN
        or len(nonce_b64) != _NONCE_B64_LEN
        or not ciphertext_b64
    ):
        raise TurcryptorError("Not a valid Turcryptor payload.")

    try:
        salt = base64.urlsafe_b64decode(salt_b64)
        nonce = base64.urlsafe_b64decode(nonce_b64)
        ciphertext = base64.urlsafe_b64decode(ciphertext_b64)
        if len(salt) != SALT_SIZE or len(nonce) != NONCE_SIZE or not ciphertext:
            raise ValueError
    except (binascii.Error, ValueError) as exc:
        raise TurcryptorError("Not a valid Turcryptor payload.") from exc

    key = derive_key(password, salt)
    try:
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, None)
    except InvalidTag as exc:
        raise TurcryptorError(
            "Wrong password or corrupted encrypted message."
        ) from exc

    return plaintext.decode("utf-8")
