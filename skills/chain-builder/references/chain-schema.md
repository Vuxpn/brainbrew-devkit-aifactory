# Chain YAML Schema

## Full Example

```yaml
name: dev-chain
description: "Standard development workflow"
version: 1

agents:
  - name: planner
    existing: true

  - name: plan-reviewer
    existing: true

  - name: implementer
    existing: true

  - name: code-reviewer
    existing: true

  - name: tester
    existing: true

  - name: debugger
    existing: true

  - name: git-manager
    existing: true

  - name: security-scanner
    existing: false
    description: "Scan code for OWASP top 10 vulnerabilities"
    model: sonnet
    tools: [Read, Grep, Glob, Bash]
    skills: []
    maxTurns: 15
    color: orange
    prompt: |
      Scan all modified files for security vulnerabilities.
      Focus on: injection, auth bypass, XSS, SSRF.
      Output: PASS or ISSUES with specific file:line references.

flow:
  planner:
    next: plan-reviewer
  plan-reviewer:
    next: implementer
    on_issues: planner
  implementer:
    next: code-reviewer
  code-reviewer:
    next: tester
    on_issues: implementer
  tester:
    next: git-manager
    on_fail: debugger
  debugger:
    next: implementer
  git-manager:
    next: null

verification:
  code-reviewer:
    minLength: 50
    requiredAny: ["APPROVED", "ISSUES"]
  tester:
    minLength: 50
    requiredAny: ["PASS", "FAIL"]
```

## Field Reference

### Top-level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Chain identifier, kebab-case |
| description | string | yes | What this chain does |
| version | number | no | Schema version (default: 1) |
| agents | list | yes | Agent definitions |
| flow | map | yes | Directed graph of agent connections |
| verification | map | no | Quality gates per agent |

### Agent (existing)

| Field | Type | Description |
|-------|------|-------------|
| name | string | Must match filename in `~/.claude/agents/{name}.md` |
| existing | true | Reference only, no generation |

### Agent (new)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Agent identifier |
| existing | false | yes | Signals generation needed |
| description | string | yes | When to delegate to this agent |
| model | string | no | sonnet, opus, haiku (default: sonnet) |
| tools | list | no | Tool allowlist |
| skills | list | no | Skills to preload |
| maxTurns | number | no | Max agentic turns (default: 20) |
| color | string | no | UI color |
| prompt | string | yes | Agent system prompt (markdown) |

### Flow entry

| Field | Type | Description |
|-------|------|-------------|
| next | string/null | Next agent. `null` = terminal |
| on_issues | string | Route here if output contains ISSUES |
| on_fail | string | Route here if output contains FAIL |

### Verification entry

| Field | Type | Description |
|-------|------|-------------|
| minLength | number | Minimum output length |
| requiredAny | list | At least one of these strings must appear |

## Generation Mapping

### YAML → chain-config.json

```
flow.{agent}.next       → agents.{agent}.chainNext
flow.{agent}.on_issues  → agents.{agent}.conditionalNext.on_issues
flow.{agent}.on_fail    → agents.{agent}.conditionalNext.on_fail
```

### YAML → agent .md file

```yaml
# From YAML:
- name: security-scanner
  existing: false
  description: "Scan for vulnerabilities"
  model: sonnet
  tools: [Read, Grep, Glob, Bash]
  prompt: |
    Scan all modified files...
```

```markdown
# Generated: ~/.claude/agents/security-scanner.md
---
name: security-scanner
description: >-
  Scan for vulnerabilities
model: sonnet
tools: Read, Grep, Glob, Bash
maxTurns: 15
color: orange
---

Scan all modified files...
```

### YAML → verification-rules.json

```
verification.{agent}.minLength    → {agent}.minLength
verification.{agent}.requiredAny  → {agent}.required + requiredAny: true
verification.{agent} + flow.next  → {agent}.chainNext
```
