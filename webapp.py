#!/usr/bin/env python3
"""
Turcryptor web UI — a local-only web frontend for turcryptor.core.

Binds to 127.0.0.1 by default and never writes anything to disk.
Passwords and messages live only in the request cycle / browser memory.
"""

import argparse
import collections
import threading
import time

from flask import Flask, jsonify, render_template, request

from turcryptor import TurcryptorError, decrypt_message, encrypt_message

MAX_MESSAGE_CHARS = 100_000
MAX_PAYLOAD_CHARS = 500_000

RATE_LIMIT = 30        # requests ...
RATE_WINDOW = 60.0     # ... per 60 seconds per client

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

_hits: dict[str, collections.deque] = collections.defaultdict(collections.deque)
_hits_lock = threading.Lock()


def rate_limited(client: str) -> bool:
    now = time.monotonic()
    with _hits_lock:
        hits = _hits[client]
        while hits and now - hits[0] > RATE_WINDOW:
            hits.popleft()
        if len(hits) >= RATE_LIMIT:
            return True
        hits.append(now)
        return False


@app.after_request
def harden_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def index():
    return render_template("index.html")


def json_body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text_field(data: dict, key: str, limit: int) -> str | None:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        return None
    if len(value) > limit:
        return None
    return value


@app.post("/api/encrypt")
def api_encrypt():
    if rate_limited(request.remote_addr or "?"):
        return jsonify(ok=False, error="Too many requests — slow down."), 429

    data = json_body()
    message = text_field(data, "message", MAX_MESSAGE_CHARS)
    password = text_field(data, "password", 1024)
    confirm = data.get("confirm", password)

    if message is None:
        return jsonify(ok=False, error="Message is empty or too large."), 400
    if password is None:
        return jsonify(ok=False, error="Password cannot be empty."), 400
    if confirm != password:
        return jsonify(ok=False, error="Passwords do not match."), 400

    return jsonify(ok=True, payload=encrypt_message(message, password))


@app.post("/api/decrypt")
def api_decrypt():
    if rate_limited(request.remote_addr or "?"):
        return jsonify(ok=False, error="Too many requests — slow down."), 429

    data = json_body()
    payload = text_field(data, "payload", MAX_PAYLOAD_CHARS)
    password = text_field(data, "password", 1024)

    if payload is None:
        return jsonify(ok=False, error="Encrypted payload is empty or too large."), 400
    if password is None:
        return jsonify(ok=False, error="Password cannot be empty."), 400

    try:
        return jsonify(ok=True, message=decrypt_message(payload, password))
    except TurcryptorError as exc:
        return jsonify(ok=False, error=str(exc)), 400


def main():
    parser = argparse.ArgumentParser(description="Turcryptor web UI")
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5757, help="port (default: 5757)")
    args = parser.parse_args()

    url = f"http://{args.host}:{args.port}"
    print(f"  ✓ Turcryptor web UI running at {url}  (Ctrl+C to stop)")
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
