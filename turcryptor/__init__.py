"""Turcryptor — password-based text encryption (AES-256-GCM + Scrypt)."""

from turcryptor.core import TurcryptorError, decrypt_message, encrypt_message

__all__ = ["encrypt_message", "decrypt_message", "TurcryptorError"]
