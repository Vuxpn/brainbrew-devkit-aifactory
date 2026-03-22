---
name: chain-builder
description: >-
  Set up workflow templates for projects. Trigger when user says:
  "set up a workflow", "create a development workflow", "I need a CI/CD pipeline",
  "set up devops", "initialize project workflow", "bump develop", "bump devops",
  "create agent chain", "set up marketing workflow", "configure dev environment".
---

# Chain Builder

## When user asks to set up a workflow:

**Use MCP tool `bump_template`:**

```
mcp__brainbrew__bump_template(template: "develop")
```

## Template Options

| Template | Description |
|----------|-------------|
| `develop` | Full dev chain: planner → implementer → tester → git |
| `devops` | CI/CD: scanner → security → test → deploy → monitor |
| `marketing` | Content: researcher → writer → editor → publisher |
| `research` | Analysis: researcher → gatherer → analyzer → writer |
| `docs` | Documentation: scanner → generator → reviewer → publish |
| `support` | Support: classifier → router → responder → reviewer |
| `data` | Data pipeline: collector → cleaner → analyzer → reporter |
| `moderation` | Content mod: scanner → classifier → reviewer → actioner |
| `review` | Simple code review only |
| `minimal` | Empty - add your own |

## Natural Language → Template

| User says | Template |
|-----------|----------|
| "set up dev workflow" | develop |
| "CI/CD pipeline" | devops |
| "content marketing" | marketing |
| "documentation workflow" | docs |
| "start from scratch" | minimal |

## After Setup - Tell User:

```
Workflow set up! You can now:
- "Create an agent for X" → mcp__brainbrew__create_agent
- "Create a skill for Y" → mcp__brainbrew__create_skill
- "Tell implementer to Z" → mcp__brainbrew__memory_add
- "Show me the chain flow" → mcp__brainbrew__get_chain_flow
```
