# Chain Validation Rules

Run all checks before generating config files. Report as checklist.

## Checks

### 1. Agents Exist

Every agent name in `flow:` must either:
- Have `existing: true` AND a file at `~/.claude/agents/{name}.md`
- Have `existing: false` with a `prompt:` field (will be generated)

```bash
# Check existing agent
test -f ~/.claude/agents/{name}.md
```

### 2. No Broken Links

Every `next`, `on_issues`, `on_fail` value must reference an agent defined in `agents:`.

### 3. No Orphan Agents

Every agent in `agents:` must appear in `flow:` (either as a key or as a target).

### 4. Terminal Node Exists

At least one agent must have `next: null`.

### 5. Cycle Detection

Detect cycles in the flow graph. **WARN but don't block** — cycles like `debugger → implementer` are intentional.

Report: "⚠️ 1 cycle: debugger → implementer (intentional)"

### 6. Skills Exist

For agents with `existing: false` and `skills:` defined, verify each skill exists:

```bash
test -d ~/.claude/skills/{skill-name}
```

## Output Format

```
Chain "{name}" validation:
  ✅ All {N} agents have definitions
  ✅ All links resolve
  ✅ Terminal node: {agent-name}
  ✅ No orphan agents
  ⚠️  {N} cycle(s): {agent} → {agent}
  ✅ All skills exist

  PASS | FAIL (with reasons)
```

## FAIL conditions

- Any agent missing (no file, no inline definition)
- Any broken link
- No terminal node

## WARN conditions (don't fail)

- Cycles detected
- Orphan agents
- Missing optional verification rules
