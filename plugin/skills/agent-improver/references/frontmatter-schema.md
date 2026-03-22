# Agent Frontmatter Schema

## Required Fields

| Field | Description |
|-------|-------------|
| `name` | Unique ID, lowercase + hyphens only |
| `description` | When Claude should delegate to this agent. Be specific. |
| `skills` | Skills preloaded into agent context. Every agent MUST have at least one skill from `.claude/skills/` (project root) |

## Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `tools` | Allowlist of tools. Inherits ALL if omitted. | `Read, Grep, Glob, Bash` |
| `disallowedTools` | Denylist removed from inherited/specified tools | `Write, Edit` |
| `model` | `sonnet`, `opus`, `haiku`, `inherit`, or full model ID | `sonnet` |
| `permissionMode` | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` | `default` |
| `maxTurns` | Max agentic turns before stopping | `20` |
| `mcpServers` | MCP servers available to this agent | `- github` |
| `hooks` | Lifecycle hooks scoped to this agent | See hooks docs |
| `memory` | Persistent memory: `user`, `project`, or `local` | `local` |
| `background` | Always run as background task | `true` |
| `isolation` | `worktree` for isolated git copy | `worktree` |
| `color` | UI background color | `red` |

## Model Selection Guide

| Use Case | Model | Why |
|----------|-------|-----|
| Complex reasoning, architecture | `opus` | Best quality |
| Focused tasks, code review, testing | `sonnet` | Balance of quality + speed |
| Fast lookups, simple delegation | `haiku` | 2x speed, 3x cheaper |
| Match parent conversation | `inherit` | Default if omitted |

## Common Mistakes

```yaml
# Wrong — description is a wall of text with examples
description: "Use this agent when... Examples:\n- User: \"...\"\n  Assistant: \"...\""

# Right — concise, trigger-focused
description: >-
  Reviews code for bugs, security, and performance.
  Use after implementation. Returns APPROVED or ISSUES.

# Wrong — no tool scoping (inherits everything)
---
name: code-reviewer
description: Reviews code
---

# Right — read-only tools for reviewer
---
name: code-reviewer
description: Reviews code for bugs, security, and performance.
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
model: sonnet
---
```
