---
name: agent-improver
description: >-
  Create and improve agents. Trigger when user says:
  "create an agent for X", "build me an agent", "I need an agent that does Y",
  "make a code review agent", "create a testing agent", "improve my agent",
  "list agents", "show me agents", "what agents do I have".
---

# Agent Management

## Create Agent

Write directly to `.claude/agents/{name}.md`:

```markdown
---
name: agent-name
description: >-
  What this agent does and when Claude should delegate to it.
  Be specific. Include "Use proactively" if it should auto-trigger.
tools: Read, Grep, Glob, Bash
# Optional fields below - include only when needed:
# disallowedTools: Write, Edit           # Tools to deny (removed from inherited set)
# model: sonnet                           # sonnet, opus, haiku, inherit, or full model ID
# permissionMode: default                 # default, acceptEdits, dontAsk, bypassPermissions, plan
# maxTurns: 20                            # Max agentic turns before stopping
# skills:                                 # Skills preloaded into context at startup
#   - api-conventions
#   - error-handling
# mcpServers:                             # MCP servers scoped to this agent
#   - github                              # Reference existing server by name
#   - playwright:                         # Or inline definition
#       type: stdio
#       command: npx
#       args: ["-y", "@playwright/mcp@latest"]
# hooks:                                  # Lifecycle hooks scoped to this agent
#   PreToolUse:
#     - matcher: "Bash"
#       hooks:
#         - type: command
#           command: "./scripts/validate.sh"
# memory: project                         # Persistent memory: user, project, or local
# background: false                       # true = always run as background task
# effort: high                            # low, medium, high, max
# isolation: worktree                     # Run in isolated git worktree
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
| `model` | No | `sonnet`, `opus`, `haiku`, `inherit`, or full model ID (e.g. `claude-opus-4-6`) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Max agentic turns before auto-stop |
| `skills` | No | Skills preloaded into agent context (full content injected) |
| `mcpServers` | No | MCP servers: string reference or inline definition |
| `hooks` | No | PreToolUse/PostToolUse/Stop hooks scoped to this agent |
| `memory` | No | `user` (~/.claude/agent-memory/), `project` (.claude/agent-memory/), `local` (.claude/agent-memory-local/) |
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

When memory is enabled, include in system prompt:
```
Update your agent memory as you discover patterns, conventions, and
architectural decisions. This builds institutional knowledge across conversations.
```

## Key Principles

1. **Focused responsibility** — Each agent excels at one specific task
2. **Detailed description** — Claude uses this to decide when to delegate
3. **Minimal tool access** — Grant only necessary permissions
4. **Imperative system prompt** — Clear instructions, not persona descriptions
5. **Specify model** — Use haiku for fast/cheap, sonnet for balanced, opus for complex

## List Agents

```bash
ls .claude/agents/*.md
```

## Add Agent to Chain Flow

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

## Agent Teams vs Parallel Subagents

**IMPORTANT:** When user wants agents to work in parallel, choose the right pattern:

### Agent Team (TeamCreate) — for complex parallel work
- Multiple **independent** Claude Code sessions
- Teammates have their own context, can **message each other**
- Shared task list with self-coordination
- Use when: teammates need to discuss, challenge each other, or coordinate
- Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

To create an agent team, use **TeamCreate** tool (NOT the Agent tool):
```
TeamCreate(team_name: "review-team", description: "Parallel code review")
```

Then spawn teammates via Agent tool with `team_name` parameter:
```
Agent(subagent_type: "code-reviewer", team_name: "review-team", name: "quality-reviewer")
Agent(subagent_type: "security-scan", team_name: "review-team", name: "security-reviewer")
```

When done, shut down teammates via SendMessage, then clean up:
```
TeamDelete()
```

### Parallel Subagents (Agent tool) — for quick independent tasks
- Run within **one session**, report results back to parent
- Cannot message each other
- Use when: tasks are independent and only the result matters

```
Agent(subagent_type: "code-reviewer", run_in_background: true)
Agent(subagent_type: "security-scan", run_in_background: true)
```

### Chain Team Node — for chain workflows
In the active chain file (`.claude/chains/`), use `type: team` to automatically trigger TeamCreate:

```yaml
flow:
  parallel-review:
    type: team
    teammates:
      - name: code-quality
        agent: code-reviewer
        prompt: "Review code for bugs and quality"
      - name: security-check
        agent: security-scan
        prompt: "Scan for security vulnerabilities"
    routes:
      next-agent: "All reviews passed"
      fallback-agent: "Issues found"
    decide: |
      If ALL passed → "next-agent"
      If ANY failed → "fallback-agent"
```

The chain hook handles TeamCreate/TeamDelete automatically.

### Decision Guide

| User says | Use |
|---|---|
| "run review and security in parallel" | **Agent Team** (TeamCreate) |
| "create a team of agents" | **Agent Team** (TeamCreate) |
| "agents that collaborate/discuss" | **Agent Team** (TeamCreate) |
| "quick parallel search" | **Parallel Subagents** (Agent tool) |
| "add parallel step to chain" | **Chain team node** (type: team) |

**DO NOT** create multiple regular agents via Agent tool when user asks for a "team" — use TeamCreate instead.

## Send Messages to Agent

Use Memory Bus:
```
mcp__brainbrew__memory_add(content: "...", target: "agent:agent-name")
```

## Improve Existing Agent

1. Read the agent file: `.claude/agents/{name}.md`
2. Check against frontmatter reference above — are fields correct?
3. Verify description is specific with trigger phrases
4. Verify tools are scoped to minimum needed
5. Verify system prompt uses imperative voice
6. Check if `skills` field should preload companion skills
7. Check if `memory` would benefit this agent
