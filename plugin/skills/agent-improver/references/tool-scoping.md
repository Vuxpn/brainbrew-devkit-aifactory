# Tool Scoping Guide

## Why Scope Tools?

If `tools` is omitted, the agent inherits ALL tools. This is dangerous — a reviewer shouldn't write files, a planner shouldn't edit code.

## Available Tools

Core tools: `Read`, `Write`, `Edit`, `MultiEdit`, `Glob`, `Grep`, `Bash`, `Agent`, `Skill`, `WebFetch`, `WebSearch`, `NotebookEdit`

## Scoping by Agent Role

### Read-Only Agents (planners, reviewers, researchers)
```yaml
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit, MultiEdit
```

### Implementation Agents (coders, fixers)
```yaml
tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash
```

### Test Agents
```yaml
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
```

### Orchestrator Agents (coordinators)
```yaml
tools: Agent(worker, researcher), Read, Bash
```

## Restricting Subagent Spawning

```yaml
# Only allow specific subagents
tools: Agent(worker, researcher), Read, Bash

# Allow any subagent
tools: Agent, Read, Bash

# No subagent spawning (omit Agent entirely)
tools: Read, Bash
```

## MCP Server Scoping

Scope MCP servers to agents that need them instead of global config:
```yaml
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github  # reference existing server
```

## Permission Modes

| Mode | When to Use |
|------|-------------|
| `default` | Standard — prompts for permissions |
| `acceptEdits` | Auto-accept file edits (trusted implementer) |
| `dontAsk` | Auto-deny prompts (safe for background) |
| `bypassPermissions` | Skip all checks (use with caution) |
| `plan` | Read-only exploration mode |
```
