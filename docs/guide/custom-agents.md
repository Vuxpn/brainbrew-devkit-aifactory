# Custom Agents

Create agents tailored to your specific workflow needs.

## Creating an Agent

Ask naturally:

```
"Create an agent for API testing"
"I need an agent that reviews SQL queries"
"Make me a documentation agent"
```

Or manually create `.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: >-
  What this agent does and when Claude should delegate to it.
  Be specific. Include "Use proactively" if it should auto-trigger.
tools: Read, Grep, Glob, Bash
---

You are [role description]. [System prompt for the agent.]

When invoked:
1. First step
2. Second step
3. Third step

## Output Format

[Expected output structure]
```

## Frontmatter Reference

| Field | Required | Purpose |
|---|---|---|
| `name` | Yes | Unique ID, lowercase + hyphens |
| `description` | Yes | When Claude should delegate. Include "Use proactively" for auto-trigger |
| `tools` | No | Allowlist of tools. Inherits all if omitted |
| `disallowedTools` | No | Denylist (removed from inherited/specified set) |
| `model` | No | `sonnet`, `opus`, `haiku`, `inherit`, or full model ID |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before auto-stop |
| `skills` | No | Skills preloaded into agent context (full content injected) |
| `mcpServers` | No | MCP servers: string reference or inline definition |
| `hooks` | No | PreToolUse/PostToolUse/Stop hooks scoped to this agent |
| `memory` | No | `user`, `project`, or `local` |
| `background` | No | `true` = always run as background task |
| `effort` | No | `low`, `medium`, `high`, `max` |
| `isolation` | No | `worktree` = isolated git worktree copy |

## Agent Scope

| Location | Scope | Priority |
|---|---|---|
| `--agents` CLI flag | Current session only | 1 (highest) |
| `.claude/agents/` | Current project | 2 |
| `~/.claude/agents/` | All your projects | 3 |
| Plugin `agents/` dir | Where plugin enabled | 4 (lowest) |

Higher priority wins when names collide.

## Model Selection Guide

| Model | Best for |
|---|---|
| `haiku` | Fast, cheap: exploration, search, simple tasks |
| `sonnet` | Balanced: code review, analysis, moderate complexity |
| `opus` | Most capable: complex reasoning, architecture, planning |
| `inherit` | Same as main conversation (default) |

## Memory Scopes

| Scope | Location | Use when |
|---|---|---|
| `user` | `~/.claude/agent-memory/{name}/` | Knowledge applies across all projects |
| `project` | `.claude/agent-memory/{name}/` | Project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/{name}/` | Project-specific, NOT in VCS |

## Key Principles

1. **Focused responsibility** — Each agent excels at one specific task
2. **Detailed description** — Claude uses this to decide when to delegate
3. **Minimal tool access** — Grant only necessary permissions
4. **Imperative system prompt** — Clear instructions, not persona descriptions
5. **Specify model** — Use haiku for fast/cheap, sonnet for balanced, opus for complex

## Add Agent to Chain

Edit the active chain file in `.claude/chains/`, add to `flow:` section:

```yaml
flow:
  new-agent:
    routes:
      next-agent: "Description of when to go here"
      fallback-agent: "Description of fallback"
    decide: |
      If SUCCESS → "next-agent"
      If FAILED → "fallback-agent"
```

Then update the previous agent's routes to point to the new agent.

## List Agents

```bash
ls .claude/agents/*.md
```
