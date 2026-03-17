---
name: fix
description: ⚡ Analyze and fix issues. Use "logs" for log-based debugging, "fast" for quick fixes
argument-hint: [logs] [fast] [issue]
---

# Fix

Analyze and fix issues with automatic complexity detection and specialized workflows.

## Modes

### Fast Mode (keyword: "fast")
Quick workflow for simple issues:
1. If user provides screenshots/videos, use `ai-multimodal` skill to describe the issue
2. Use `debugger` subagent to find root cause
3. Use `problem-solving` skill to tackle the issue
4. Use `implementer` subagent to fix
5. Use `tester` agent to verify
6. Report summary to user

### Logs Mode (keyword: "logs")
Log-based debugging workflow:
1. Use `debugger` subagent to read `./logs.txt` and find root causes
   - If no `./logs.txt`, reproduce issue and pipe logs to `./logs.txt`
2. Use `scout` subagent to find exact issue locations in codebase
3. Use `planner` subagent to create implementation plan
4. Use `implementer` subagent to fix
5. Use `tester` agent to verify
6. Use `code-reviewer` subagent to review changes
7. Report summary to user

### Auto-Detect Mode (default)
If a markdown implementation plan exists, use `/code <path-to-plan>`.

Otherwise:
1. Analyze the issue and ask for details if needed
2. Decide between fast vs logs vs full investigation
3. Execute appropriate workflow

## Important

- Analyze the skills catalog and activate needed skills during the process
- If tests fail or issues persist, repeat from diagnosis step
- After completion, explain changes briefly and suggest next steps
