#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime

log_dir = Path.home() / ".claude" / "plugins" / "cost-tracker"
log_file = log_dir / "usage.jsonl"
summary_file = log_dir / "last-summary.json"

def main():
    if not log_file.exists():
        return

    lines = log_file.read_text().strip().splitlines()
    if not lines:
        return

    entries = []
    for line in lines:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    session_entries = [e for e in entries if e.get("cost_usd") is not None]
    if not session_entries:
        return

    total_input = sum(e.get("input_tokens", 0) for e in session_entries)
    total_output = sum(e.get("output_tokens", 0) for e in session_entries)
    total_cost = sum(e.get("cost_usd", 0) for e in session_entries)

    summary = {
        "ts": datetime.utcnow().isoformat(),
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cost_usd": round(total_cost, 6),
        "tool_calls": len(session_entries),
    }

    summary_file.write_text(json.dumps(summary, indent=2))

    print(f"[cost-tracker] Session cost: ${total_cost:.4f} | {total_input + total_output} tokens")

    log_file.write_text("")

main()
