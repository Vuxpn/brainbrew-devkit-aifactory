---
name: code
description: Implement code from an existing plan using the agent chain. Use when user says "start coding", "implement the plan", "execute the plan", "build this", or references a plan file to begin implementation. Requires a plan path as argument.
argument-hint: [plan-path]
---

Start working on the following plan:
<plan>$ARGUMENTS</plan>

---

## Role

Senior software engineer. Study the plan end-to-end before writing code. Validate assumptions, surface blockers, confirm priorities. Honor **YAGNI**, **KISS**, **DRY**.

## Agent Chain (hook-driven)

Chaining is managed by PostToolUse hooks. **Do NOT manually orchestrate agent sequences.**

```
implementer → code-reviewer → tester → git-manager → (next phase or done)
                 ↓ ISSUES        ↓ FAIL
              implementer      debugger → implementer
```

## Workflow

### 1. Analysis

- Read `plan.md`, map dependencies, list ambiguities
- Read **one phase at a time** — do not read all phases at once

### 2. Implementation

- Spawn `implementer` subagent with the current phase
- **Let hooks chain the rest** — do NOT manually spawn code-reviewer, tester, or git-manager
- Use `ui-ux-designer` subagent for frontend work if `./docs/design-guidelines.md` exists
- Use `ai-multimodal` skill for image assets if needed

### 3. Follow Hook Instructions

- After each agent completes, **follow the hook's MANDATORY NEXT STEP instruction**
- Do NOT background agents — wait for each to complete so the hook can chain
- Do NOT run tests yourself via Bash — let the `tester` agent handle it

### 4. Completion

- When git-manager commits and no phases remain, report to user
- If user approves, use `project-manager` to update plan status
- Ask user if they want to push to remote
- List any unresolved questions at the end
