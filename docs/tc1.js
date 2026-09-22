/**
 * TURCRYPTOR TC1 — client-side crypto core.
 *
 * Byte-for-byte compatible with the Python implementation
 * (turcryptor/core.py). Payload format:
 *
 *     TC1:<salt b64url>:<nonce b64url>:<ciphertext b64url>
 *
 * Scrypt(N=2^15, r=8, p=1, dkLen=32) derives the key; AES-256-GCM
 * (WebCrypto) does the encryption. Everything runs in this tab —
 * no server ever sees the password or the message.
 */

(function () {
  "use strict";

  const VERSION = "TC1";
  const SALT_SIZE = 16;
  const NONCE_SIZE = 12;
  const KEY_SIZE = 32;

  const SCRYPT_N = 2 ** 15;
  const SCRYPT_R = 8;
  const SCRYPT_P = 1;

  /* ── base64url (with padding, matching Python's urlsafe_b64encode) ── */

  function b64urlEncode(bytes) {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_");
  }

  function b64urlDecode(str) {
    const std = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(std);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /* ── key derivation ───────────────────────────────────────────── */

  async function deriveKey(password, salt) {
    const pwBytes = new TextEncoder().encode(password);
    const keyBytes = await window.scrypt.scrypt(
      pwBytes, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, KEY_SIZE,
    );
    return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);
  }

  /* ── public API ───────────────────────────────────────────────── */

  async function encryptMessage(message, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
    const key = await deriveKey(password, salt);

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        new TextEncoder().encode(message),
      ),
    );

    return [
      VERSION,
      b64urlEncode(salt),
      b64urlEncode(nonce),
      b64urlEncode(ciphertext),
    ].join(":");
  }

  class Tc1Error extends Error {}

  async function decryptMessage(payload, password) {
    let parts;
    try {
      parts = payload.trim().split(":");
    } catch {
      throw new Tc1Error("format");
    }
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Tc1Error("format");
    }

    const [, saltB64, nonceB64, ctB64] = parts;
    // fail fast, exactly like the Python core, before the expensive scrypt
    if (saltB64.length !== 24 || nonceB64.length !== 16 || !ctB64) {
      throw new Tc1Error("format");
    }

    let salt, nonce, ciphertext;
    try {
      salt = b64urlDecode(saltB64);
      nonce = b64urlDecode(nonceB64);
      ciphertext = b64urlDecode(ctB64);
    } catch {
      throw new Tc1Error("format");
    }
    if (salt.length !== SALT_SIZE || nonce.length !== NONCE_SIZE || !ciphertext.length) {
      throw new Tc1Error("format");
    }

    const key = await deriveKey(password, salt);
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        ciphertext,
      );
      return new TextDecoder().decode(plaintext);
    } catch {
      throw new Tc1Error("auth");
    }
  }

  window.TC1 = {
    VERSION,
    encryptMessage,
    decryptMessage,
    Tc1Error,
  };
})();
