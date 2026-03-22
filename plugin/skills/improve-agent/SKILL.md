---
name: improve-agent
description: >-
  Create and improve agents. Trigger when user says:
  "create an agent for X", "build me an agent", "I need an agent that does Y",
  "make a code review agent", "create a testing agent", "improve my agent",
  "list agents", "show me agents", "what agents do I have".
---

# Agent Management

## Create Agent

**Use MCP tool `create_agent`:**

```
mcp__brainbrew__create_agent(
  name: "api-tester",
  description: "Test API endpoints for correctness and performance",
  tools: ["Bash", "Read", "WebFetch"],
  instructions: "## Steps\n1. Read API spec\n2. Run tests\n3. Report results"
)
```

## List Agents

```
mcp__brainbrew__list_agents()
```

## Natural Language → MCP

| User says | MCP call |
|-----------|----------|
| "Create an agent for API testing" | `create_agent(name: "api-tester", ...)` |
| "I need a documentation agent" | `create_agent(name: "doc-writer", ...)` |
| "What agents do I have?" | `list_agents()` |
| "Show my agents" | `list_agents()` |

## After Creating Agent

Tell user they can:
1. Add agent to chain flow: `mcp__brainbrew__add_agent_to_flow`
2. Send messages to it: `mcp__brainbrew__memory_add(target: "agent:NAME")`
