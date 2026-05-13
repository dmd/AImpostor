#!/usr/bin/env -S UV_CACHE_DIR=/private/tmp/codex-uv-cache uv run --script
# /// script
# dependencies = [
#   "requests",
#   "websocket-client",
# ]
# ///

import argparse
import json
import sys
import time

import requests
import websocket


def page_target(port: int) -> dict:
    targets = requests.get(f"http://127.0.0.1:{port}/json/list", timeout=5).json()
    for target in targets:
        if target.get("type") == "page" and "chatgpt.com" in target.get("url", ""):
            return target
    raise RuntimeError("No ChatGPT page target found")


def cdp_call(ws: websocket.WebSocket, method: str, params: dict | None = None, call_id: int = 1) -> dict:
    ws.send(json.dumps({"id": call_id, "method": method, "params": params or {}}))
    deadline = time.time() + 10
    while time.time() < deadline:
        message = json.loads(ws.recv())
        if message.get("id") == call_id:
            return message
    raise TimeoutError(f"Timed out waiting for {method}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9227)
    parser.add_argument("--expr", default="document.readyState")
    args = parser.parse_args()

    target = page_target(args.port)
    ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=10)
    try:
        cdp_call(ws, "Runtime.enable", call_id=1)
        result = cdp_call(
            ws,
            "Runtime.evaluate",
            {
                "expression": args.expr,
                "awaitPromise": True,
                "returnByValue": True,
                "timeout": 5000,
            },
            call_id=2,
        )
    finally:
        ws.close()

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
