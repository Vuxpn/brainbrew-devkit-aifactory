---
name: chain-builder
description: Create, modify, and manage agent chains through natural language. Use when user says "show chain", "add agent to chain", "create chain", "modify chain", "activate chain", "switch chain", "test chain", or wants to customize agent workflow.
argument-hint: [describe what you want to do with the chain]
---

# Chain Builder

Build and manage agent chains through natural language. Single YAML file = entire chain.

## Workflow

1. **Understand** — read current chain state, show diagram
2. **Modify** — interpret natural language, update chain YAML
3. **Validate** — topology check before any generation
4. **Generate** — produce chain-config.json + agent files + verification rules
5. **Activate** — switch active chain

## Commands

| Intent | Action |
|--------|--------|
| Show chain | Read `chain-config.json` → display text diagram |
| Add agent X after Y | Update YAML → validate → generate |
| Create agent X | Generate agent `.md` + add to YAML |
| Remove agent X | Update YAML → validate → generate |
| When X fails, go to Y | Update conditional routing in YAML |
| Save chain as NAME | Write `~/.claude/chains/NAME.yaml` |
| Activate chain NAME | Load YAML → backup → validate → generate |
| Switch to NAME | Backup current → activate NAME |
| List chains | `ls ~/.claude/chains/*.yaml` |
| Test chain | Run validation, report results |

## Show Chain Diagram

Read `~/.claude/hooks/chains/chain-config.json` and display:

```
planner → plan-reviewer → implementer → code-reviewer → tester → git-manager
              ↓ ISSUES        ↓ ISSUES        ↓ FAIL
            planner        implementer      debugger → implementer
```

## Modify Chain

Parse user's natural language → update `~/.claude/chains/{name}.yaml`.
Schema reference: `references/chain-schema.md`

## Validate

Before every generate, run checks from `references/validation-rules.md`:
- All agents exist (file or inline)
- No broken links
- No orphans
- Terminal node exists
- Warn on cycles (don't block)
- Skills exist

## Generate

From YAML, produce 3 outputs:

```bash
# 1. Backup
cp ~/.claude/hooks/chains/chain-config.json ~/.claude/chains/.backup/chain-config.json.bak
cp ~/.claude/hooks/chains/verification-rules.json ~/.claude/chains/.backup/verification-rules.json.bak

# 2. Generate chain-config.json from YAML flow section
# 3. Generate verification-rules.json from YAML verification section
# 4. Generate agent .md files for existing: false agents only
```

**Never overwrite existing agent `.md` files.**

## Rules

- YAML in `~/.claude/chains/` is the source of truth
- Always validate before generate
- Always backup before overwrite
- Ask user to confirm before activating
- Show diagram after every modification
