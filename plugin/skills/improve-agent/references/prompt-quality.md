# Agent Prompt Quality Guide

## Description Field

The description determines WHEN Claude delegates to this agent.

### Good Descriptions
```yaml
# Concise + trigger conditions
description: >-
  Reviews code for bugs, security vulnerabilities, and performance.
  Use after implementation. Returns APPROVED or ISSUES with fixes.

# Action-focused
description: >-
  Implements code based on plans. Use after planning phase.
  Writes clean, production-ready code following codebase patterns.
```

### Bad Descriptions
```yaml
# Too long — wastes context with examples
description: "Use this agent when...\n\nExamples:\n- User says X\n  Agent does Y..."

# Too vague
description: Helps with code.

# Missing triggers
description: Expert software architect.
```

## System Prompt (Markdown Body)

### Keep Under 100 Lines
Move reference material to skills preloaded via `skills:` field.

### DO Include
- Clear role statement (1-2 lines)
- Step-by-step process
- Output format/template
- Constraints (what NOT to do)
- Verdict rules (for review agents)

### DO NOT Include
- "Core Competencies" / "Your Expertise" lists — Claude already knows
- "You excel at..." — Claude doesn't need flattery
- Repeated "IMPORTANT" markers — dilutes actual importance
- References to tools that may not exist (`docs-seeker`, `repomix`)
- Verbose "Communication Approach" sections
- Long examples of what Claude already understands

### Anti-patterns

```markdown
# Bad — listing obvious capabilities
## Core Competencies
You excel at:
- Issue Investigation
- System Behavior Analysis
- Database Diagnostics

# Bad — flattery
You are an elite, world-class engineer...

# Bad — repeated emphasis
**IMPORTANT**: Be token efficient.
**IMPORTANT**: Sacrifice grammar.
**IMPORTANT**: List unresolved questions.
**IMPORTANT**: Analyze skills catalog.

# Good — concise rules section
## Rules
- Token-efficient output
- Concise grammar over perfect prose
- List unresolved questions at end
```

### Skills Preloading

Instead of verbose inline instructions, preload skills:
```yaml
---
name: debugger
skills:
  - debugging
  - problem-solving
---

Debug the issue. Follow the debugging skill's systematic process.
```

This gives the agent full skill content without bloating the prompt.
