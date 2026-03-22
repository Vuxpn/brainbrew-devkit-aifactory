# Project Learnings

Auto-captured from agent sessions.

## 2026-03-22 14:39 |  | a2baad55

- [DEBUG] YAML frontmatter parsing: Array values in YAML must be quoted (e.g., `argument-hint: "[fast] [task]"` not `argument-hint: [fast] [task]`)
- [DEBUG] Claude Code hook matchers use regex format, not glob patterns: use `"matcher": ".*"` not `"matcher": "*"`
- [CONFIG] CWD encoding for per-project paths: replace forward slashes with hyphens (`/Users/me/app` → `-Users-me-app`)
- [CONFIG] Claude Code hook event types: PreToolUse, PostToolUse, SubagentStart, SubagentStop, Stop, SessionStart, SessionEnd, UserPromptSubmit, Notification
- [PATTERN] Hook-driven agent chain flow: planner → plan-reviewer → implementer → code-reviewer → tester → git-manager (with error handlers looping back)
- [PATTERN] Per-project hooks implementation: Load global hooks + project-specific hooks from `~/.claude/projects/{encoded-cwd}/custom-hooks/` and merge before execution
- [PATTERN] Local plugin marketplace: Use relative symlinks in `~/.claude/plugins/marketplaces/local/plugins/` pointing to actual plugin directories

