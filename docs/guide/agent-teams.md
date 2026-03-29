# Agent Teams

Agent teams run multiple agents in parallel at a chain step, enabling faster execution and diverse perspectives on the same work.

## Overview

Use `type: team` to run multiple agents in parallel:

```yaml
flow:
  parallel-review:
    type: team
    teammates:
      - name: code-quality
        agent: code-reviewer
        prompt: "Review code for bugs and quality"
      - name: security-check
        agent: security-scan
        prompt: "Scan for security vulnerabilities"
    routes:
      tester: "All reviews passed"
      implementer: "Issues found, needs fixes"
    decide: |
      If ALL reviews PASSED → "tester"
      If ANY review found issues → "implementer"
```

## How Teams Work

1. Previous agent completes → hook detects next node is `type: team`
2. Hook emits MANDATORY NEXT STEP instructing Claude to create an agent team
3. Claude spawns all teammates in parallel using TeamCreate
4. Each teammate works independently with its own context
5. After all teammates finish, results are synthesized
6. Hook routes to next agent based on `decide` rules

## Team Node Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `type` | Yes | Must be `team` |
| `teammates` | Yes | Array of teammate definitions |
| `routes` | Yes | Same as agent node — where to go after team completes |
| `decide` | No | AI routing rules applied to synthesized team output |

## Teammate Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Unique identifier for this teammate |
| `agent` | Yes | Agent type to spawn (must exist in `.claude/agents/`) |
| `prompt` | No | Specific instructions for this teammate's focus area |
| `model` | No | Override model (sonnet, opus, haiku) |

## When to Use Teams vs Sequential

| Use Teams | Use Sequential |
|-----------|---------------|
| Independent tasks (review + security + tests) | Tasks that depend on each other |
| Different perspectives on same work | Each step builds on previous output |
| Speed matters — parallel is faster | Order matters — must be sequential |
| Teammates don't edit same files | Agents modify shared files |

## Examples

### Parallel Code Review

```yaml
comprehensive-review:
  type: team
  teammates:
    - name: security
      agent: security-scan
      prompt: "Focus on vulnerabilities, injection risks, exposed secrets"
    - name: quality
      agent: code-reviewer
      prompt: "Focus on bugs, logic errors, naming, patterns"
    - name: performance
      agent: code-reviewer
      prompt: "Focus on performance bottlenecks, memory leaks, N+1 queries"
  routes:
    tester: "All clear"
    implementer: "Issues found"
```

### Parallel Research

```yaml
parallel-research:
  type: team
  teammates:
    - name: frontend-scout
      agent: scout
      prompt: "Explore frontend architecture, components, state management"
    - name: backend-scout
      agent: scout
      prompt: "Explore backend architecture, APIs, database schema"
    - name: test-scout
      agent: scout
      prompt: "Explore test coverage, testing patterns, CI setup"
  routes:
    planner: "Research complete, ready to plan"
```

## Requirements

Agent teams require the experimental teams feature:

```
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Set this in your environment or Claude Code settings.
