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
  What this agent does. Be specific about when to use it.
tools:
  - Bash
  - Read
  - Edit
  - Grep
  - Glob
skills:
  - companion-skill-name
---

# Agent Name

## Responsibilities

1. First responsibility
2. Second responsibility

## Output Format

[Expected output structure]
```

**Always create a companion skill** at `.claude/skills/{name}/SKILL.md` with domain knowledge.

## List Agents

```bash
ls .claude/agents/*.md
```

## Add Agent to Chain Flow

Edit `.claude/chain-config.yaml`, add to `flow:` section:

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

## Send Messages to Agent

Use Memory Bus:
```
mcp__brainbrew__memory_add(content: "...", target: "agent:agent-name")
```

## Improve Existing Agent

1. Read the agent file: `.claude/agents/{name}.md`
2. Review description, tools, instructions
3. Edit to improve clarity, add missing tools/skills
4. Check companion skill exists and has good content
