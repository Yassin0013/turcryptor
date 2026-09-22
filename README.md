# TURCRYPTOR

Secure text encryption — AES-256-GCM + Scrypt, runs entirely on your machine.
Nothing is ever written to disk; payloads carry their own random salt and nonce.

## Setup

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Usage

**Terminal (interactive CLI):**

```bash
./turcryptor
```

**Browser (local web UI):**

```bash
./turcryptor-web            # http://127.0.0.1:5757
./turcryptor-web --port 8080
```

The launcher scripts strip `LD_LIBRARY_PATH` before starting Python — AppImage
desktop sessions leak their own library path into the environment, which breaks
virtualenv detection in this CPython build.

The server binds to `127.0.0.1` only — it is not reachable from other machines.
Passwords and messages are processed in memory and never logged or stored, and
the API is rate-limited (30 requests/minute) to slow down brute-force attempts.

The web UI is bilingual (English / فارسی) — switch with the corner button;
the choice is remembered in the browser.

## Sharing with friends (static client-side build)

`docs/` contains a fully client-side build of the same UI and TC1 format —
scrypt runs in JavaScript (vendored `scrypt.min.js`) and AES-256-GCM in
WebCrypto. No server is involved: passwords and messages never leave the
visitor's device. It is byte-compatible with the Python core, so payloads
made by the CLI open in the browser and vice versa.

Serve it locally with any static server (e.g. `python -m http.server -d docs`),
or publish the folder on any static host (GitHub Pages etc.). See
[TELEGRAM.md](TELEGRAM.md) for wiring it into Telegram as a Mini App.

## Library use

```python
from turcryptor import encrypt_message, decrypt_message

token = encrypt_message("hello", "s3cret")
plain = decrypt_message(token, "s3cret")
```

`decrypt_message` raises `turcryptor.TurcryptorError` on a wrong password or
corrupted payload.

## Layout

| Path | What it is |
| --- | --- |
| `turcryptor/core.py` | Crypto core (AES-256-GCM + Scrypt), shared by CLI and web |
| `cryptor.py` | Interactive terminal UI (Rich) |
| `webapp.py` | Local Flask server + JSON API |
| `turcryptor-cli`, `turcryptor-web` | Launcher scripts |
| `templates/`, `static/` | Local web UI (server-side decrypt) |
| `docs/` | Static client-side build for sharing (GitHub Pages) |
| `TELEGRAM.md` | Telegram Mini App setup guide (فارسی) |
