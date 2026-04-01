# cost-tracker

Tracks Claude API token usage and estimates cost per session.
Uses Haiku pricing by default ($0.25/1M input, $1.25/1M output).
No external dependencies — stdlib only.

## Structure
hooks/post-tool.py   → logs tokens per tool call
hooks/session-end.py → prints summary, saves last-summary.json

## Install steps
1. chmod +x hooks/*.py
2. Add to .claude/hooks.json:
   - PostToolUse → hooks/post-tool.py
   - Stop → hooks/session-end.py

## Requirements
- python3 (built-in on macOS/Linux)
- Windows: python3 from python.org or Microsoft Store

## Logs
~/.claude/plugins/cost-tracker/usage.jsonl       ← per-call log
~/.claude/plugins/cost-tracker/last-summary.json ← session summary

## Pricing
Default prices match claude-haiku-4-5.
Edit PRICES dict in post-tool.py to match your actual model.

## Customize
If the user wants to modify this plugin (e.g. change pricing, log format, add Slack webhook):
  cp -r <plugin-source-path> .claude/plugins/cost-tracker/
Then edit hooks/*.py directly. No rebuild needed — Python runs from source.
