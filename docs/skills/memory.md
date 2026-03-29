# memory

Inter-agent communication via Memory Bus.

## Triggers

- "remember X"
- "tell agent Y to Z"
- "next agent should X"
- "don't forget X"
- "clear memory"
- "what do you remember"
- "pass this to implementer"
- "send message to agent"

## Usage

**Use MCP tool `memory_add`:**

```
mcp__brainbrew__memory_add(
  content: "Fix the auth bug in login.ts",
  target: "agent:implementer",
  persistence: "once"
)
```

## Natural Language to MCP

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
| `next` | Next agent only |
| `agent:NAME` | Specific agent (e.g., `agent:implementer`) |
| `chain:NAME` | All agents in chain |

## Persistence

| Type | Behavior |
|------|----------|
| `session` | **Default** - cleared on exit |
| `once` | Consumed after delivery (queue) |
| `permanent` | Forever (rules, knowledge) |

## Priority

Use `priority: "urgent"` for critical messages that should be highlighted.
