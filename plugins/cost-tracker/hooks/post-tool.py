#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from pathlib import Path

PRICES = {
    "input":  0.25 / 1_000_000,
    "output": 1.25 / 1_000_000,
}

log_dir = Path.home() / ".claude" / "plugins" / "cost-tracker"
log_file = log_dir / "usage.jsonl"

def main():
    raw = sys.stdin.read().strip()
    if not raw:
        return

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return

    usage = data.get("usage") or data.get("tool_response", {})
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)

    if not input_tokens and not output_tokens:
        return

    cost = input_tokens * PRICES["input"] + output_tokens * PRICES["output"]

    entry = {
        "ts": datetime.utcnow().isoformat(),
        "tool": data.get("tool_name", "unknown"),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": round(cost, 6),
    }

    log_dir.mkdir(parents=True, exist_ok=True)
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

main()
