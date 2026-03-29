# Memory Bus

The Memory Bus enables inter-agent communication, allowing you to send messages, instructions, and context to agents in your pipeline.

## Overview

Agents can communicate via the Memory Bus using the `memory_add` MCP tool:

```
mcp__brainbrew__memory_add(
  content: "Fix the auth bug in login.ts",
  target: "agent:implementer",
  persistence: "once"
)
```

## Natural Language Commands

| User says | MCP call |
|-----------|----------|
| "Remember to use TypeScript" | `memory_add(content, target: "global", persistence: "permanent")` |
| "Tell implementer to fix auth" | `memory_add(content, target: "agent:implementer", persistence: "once")` |
| "Next agent should check security" | `memory_add(content, target: "next", persistence: "once")` |
| "For this session, focus on perf" | `memory_add(content, target: "global", persistence: "session")` |
| "What do you remember?" | `memory_list()` |
| "Clear memory" | `memory_clear()` |
| "Forget the TypeScript rule" | `memory_clear(...)` then re-add without it |

## Targets

| Target | Who receives |
|--------|--------------|
| `global` | All agents |
| `next` | Next agent only (consumed after delivery) |
| `agent:NAME` | Specific agent (e.g., `agent:implementer`) |
| `chain:NAME` | All agents in chain |

## Persistence

| Type | Behavior | Auto-cleanup |
|------|----------|--------------|
| `session` | **Default** - temporary | On exit |
| `once` | Queue - consumed after read | After delivery |
| `permanent` | Forever (rules, knowledge) | Never |

## Priority

Use `priority: "urgent"` for critical messages that should be highlighted:

```
mcp__brainbrew__memory_add(
  content: "CRITICAL: Fix security vulnerability before deploy",
  target: "agent:implementer",
  priority: "urgent"
)
```

## Use Cases

### Tell a Specific Agent

```
"Tell the implementer to fix the auth bug"
```

### Send to Next Agent (Queue)

```
"Next agent should check security"
```

### Permanent Learning

```
"Remember to always use TypeScript"
```

### Chain Handoff

```
"After this chain, deploy to staging"
```

## Managing Memory

### List Messages

```
mcp__brainbrew__memory_list()
```

### Clear Messages

```
mcp__brainbrew__memory_clear()
```
