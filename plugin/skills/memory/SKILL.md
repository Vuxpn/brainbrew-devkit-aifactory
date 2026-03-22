---
name: memory
description: >-
  Inter-agent communication via Memory Bus. Trigger when user says:
  "remember X", "tell agent Y to Z", "next agent should X", "don't forget X",
  "clear memory", "what do you remember", "forget X", "pass this to implementer",
  "after this chain do X", "for the tester remember Y".
---

# Memory Bus - Inter-Agent Communication

Send messages between agents, from orchestrator to agents, or across chains.

## Natural Language Mapping

| User says | Action |
|-----------|--------|
| "Remember to use TypeScript" | Global permanent memory |
| "Tell the implementer to check auth" | Agent-specific, consumed once |
| "Next agent should focus on X" | Next agent only, consumed once |
| "For this session, prioritize speed" | Session-scoped memory |
| "Don't forget to run tests" | Global, session persistence |
| "What do you remember?" | List all memory |
| "Clear memory" | Clear session memory |
| "Forget about TypeScript rule" | Remove specific memory |

## Commands

### Add Memory

```bash
# Global, permanent (for learnings/preferences)
brainbrew memory add "Always use TypeScript" --persistence permanent

# To specific agent (consumed after delivery)
brainbrew memory add "Fix the auth bug in login.ts" --agent implementer --once

# To next agent (whoever runs next)
brainbrew memory add "Check security before proceeding" --target next --once

# High priority
brainbrew memory add "URGENT: Database migration needed" --priority urgent

# For a chain
brainbrew memory add "Deploy to staging" --chain devops
```

### List Memory

```bash
brainbrew memory list
brainbrew memory list --agent implementer
brainbrew memory list --global
```

### Clear Memory

```bash
brainbrew memory clear                    # Clear session memory
brainbrew memory clear --agent tester     # Clear tester-specific
brainbrew memory clear --all              # Clear everything
```

## How It Works

1. **User/Orchestrator** publishes message to Memory Bus
2. **Message** stored in `.claude/memory/bus.json`
3. **Agent starts** → SubagentStart hook subscribes to bus
4. **Relevant messages** injected into agent context
5. **'once' messages** consumed (removed) after injection

## Message Targets

| Target | Description |
|--------|-------------|
| `global` | All agents receive |
| `next` | Next agent only (queue) |
| `agent:NAME` | Specific agent type |
| `chain:NAME` | All agents in chain |
| `session:ID` | Specific session |

## Persistence

| Type | Behavior | Use Case |
|------|----------|----------|
| `session` | **DEFAULT** - Cleared when session ends | Most messages |
| `once` | Consumed after first read (queue) | One-time instructions |
| `chain` | Cleared when chain completes | Chain-specific context |
| `permanent` | Survives forever | Preferences, knowledge base, permanent routes |

**Default is `session`** - Messages are temporary and auto-cleaned when you exit Claude.

## Examples

### Chain Handoff
```
User: "After the develop chain, tell devops to deploy to staging"

→ brainbrew memory add "Deploy to staging environment" --chain devops --persistence chain
```

### Agent-to-Agent (via orchestrator)
```
User: "The code reviewer found issues, tell implementer to fix auth"

→ brainbrew memory add "Fix auth issues found by reviewer: missing null check on line 45" --agent implementer --once
```

### Learning Loop
```
User: "Remember that this project uses pnpm not npm"

→ brainbrew memory add "This project uses pnpm, not npm" --persistence permanent
```

### Urgent Task
```
User: "URGENT: Next agent must check for security vulnerabilities"

→ brainbrew memory add "Check for security vulnerabilities before proceeding" --target next --once --priority urgent
```
