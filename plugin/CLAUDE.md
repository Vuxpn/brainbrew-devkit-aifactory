# Agent Chain Protocol (MANDATORY)

## Hook-Driven Chaining

Agent workflow is managed by PostToolUse hooks. When a hook emits a **MANDATORY NEXT STEP** instruction, you MUST follow it exactly.

### Rules

1. **After any chain agent completes, ONLY follow the hook instruction.** Do NOT do manual work between chain steps (no searching, no editing, no running commands yourself).
2. **Do NOT background chain agents.** Always wait for foreground completion so the hook can fire and chain.
3. **Do NOT manually spawn chain agents.** Only spawn the FIRST agent in a chain (e.g., `implementer` for `/code`, `planner` for `/cook`). Hooks handle the rest.
4. **Do NOT run tests via Bash.** Let the `tester` agent handle it.
5. **Do NOT edit code/plans yourself** when a chain agent (planner, implementer) should do it.

### Chain Flow

```
planner -> plan-reviewer -> implementer -> code-reviewer -> tester -> git-manager
              | ISSUES        | ISSUES        | FAIL
            planner        implementer      debugger -> implementer
```

### What "follow the hook" means

- Hook says "spawn planner" -> you spawn planner. Do NOT read files and edit the plan yourself.
- Hook says "spawn implementer" -> you spawn implementer. Do NOT write code yourself.
- Hook says "spawn debugger" -> you spawn debugger. Do NOT debug yourself.
- Hook says nothing (no MANDATORY NEXT STEP) -> chain is done, report to user.
