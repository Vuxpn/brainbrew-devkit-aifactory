# Minimal Template

Bare-bones template with hooks only — add your own agents and chain.

## Chain Flow

No predefined flow. Add your own.

## Agents Included

None. Create your own agents.

## Features

- **Hooks only** — Built-in chain hooks ready to use
- **Blank slate** — Define your own workflow
- **Maximum flexibility** — Complete control over chain design

## Usage

```
mcp__brainbrew__template_bump(template: "minimal")
```

Then restart Claude Code and:

1. Create agents in `.claude/agents/`
2. Define flow in `.claude/chains/minimal.yaml`

## Getting Started

### 1. Create an Agent

Create `.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: What this agent does
tools: Read, Grep, Bash
---

Instructions for the agent...
```

### 2. Define Chain Flow

Edit `.claude/chains/minimal.yaml`:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs

flow:
  my-agent:
    routes:
      another-agent: "First step complete"

  another-agent:
    routes:
      END: "Done"
```

### 3. Start Using

Restart Claude Code, then invoke your agents.

## When to Use

Use the `minimal` template when:

- You want to build a custom workflow from scratch
- Existing templates don't fit your needs
- You want maximum control over the pipeline
