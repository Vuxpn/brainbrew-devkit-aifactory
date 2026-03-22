---
name: improve-agent
description: >-
  Create and improve agents. Trigger when user says:
  "create an agent for X", "build me an agent", "I need an agent that does Y",
  "make a code review agent", "create a testing agent", "improve my agent",
  "fix agent", "audit agents", "optimize agent definition".
argument-hint: [agent-name or agent-path]
---

# Improve Agent

Audit subagent `.md` files against official Claude Code subagent documentation and fix issues.

## Workflow

1. **Read** target agent file and understand its purpose
2. **Audit** against checklist in `references/agent-checklist.md`
3. **Audit skills** — if `skills:` exists, read and audit each skill in `.claude/skills/`. If missing, search SkillHub via `skillhub` skill to find and install matching skills
4. **Report** issues grouped by severity (critical → minor), including skill issues
5. **Fix** all issues — rewrite agent file and improve skills as needed
6. **Verify** the fixed agent passes the checklist (including skills audit)

## Audit Scope

| Check | Reference |
|-------|-----------|
| Frontmatter schema | `references/frontmatter-schema.md` |
| Tool scoping | `references/tool-scoping.md` |
| Description & prompt quality | `references/prompt-quality.md` |
| Full checklist | `references/agent-checklist.md` |
| SkillHub search | `skillhub` skill (search + install from skillhub.club) |

## Agent Locations

Agents are in `.claude/agents/` (project-scoped only).

## Examples

```bash
# Audit + fix a single agent
/improve-agent debugger

# Audit by path
/improve-agent .claude/agents/implementer.md
```

## Rules

- Fix in place — do not create copies
- Preserve the agent's intent and domain knowledge
- Do NOT touch auto-generated memory sections (from `memory:` field)
- When unsure about intent, ask user before changing
