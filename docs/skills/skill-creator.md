# skill-creator

Create and manage skills.

## Triggers

- "create a skill for X"
- "build me a skill"
- "I need a skill that does Y"
- "make a deployment skill"
- "list skills"
- "show my skills"

## Create Skill

Write directly to `.claude/skills/{name}/SKILL.md`:

```markdown
---
name: skill-name
description: >-
  When to trigger this skill. Include natural language patterns:
  "deploy to X", "run migrations", "test API endpoints".
  Use "This skill should be used when..." format for Claude auto-selection.
allowed-tools: Read, Grep, Glob
---

# Skill Name

## When to Use

- Scenario 1 when this skill applies
- Scenario 2

## When NOT to Use

- Scenario where a different skill is better
- Anti-patterns

## Instructions

1. Step 1 - imperative instruction (not "you should", use "Do X")
2. Step 2 - what to do with which tools

## Commands

\`\`\`bash
# Commands the skill may run
\`\`\`

## Output

[Expected output format]
```

## Frontmatter Reference

| Field | Required | Purpose |
|---|---|---|
| `name` | No (uses dir name) | Lowercase letters, numbers, hyphens (max 64 chars) |
| `description` | Recommended | When Claude should use this skill. Include trigger phrases |
| `allowed-tools` | No | Restrict tools: `Read, Grep, Glob, Bash` |
| `argument-hint` | No | Autocomplete hint: `[issue-number]` |
| `disable-model-invocation` | No | `true` = only user can invoke (for deploy, commit, etc.) |
| `user-invocable` | No | `false` = hide from `/` menu (background knowledge) |
| `context` | No | `fork` = run in isolated subagent |
| `agent` | No | Subagent type when `context: fork`: `Explore`, `Plan`, `general-purpose`, or custom |
| `model` | No | `sonnet`, `opus`, `haiku`, or full model ID |
| `effort` | No | `low`, `medium`, `high`, `max` (Opus 4.6 only) |
| `hooks` | No | Lifecycle hooks scoped to this skill |

## Invocation Control

| Setting | User invokes | Claude invokes |
|---|---|---|
| Default | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

Use `disable-model-invocation: true` for skills with side effects (deploy, commit, send-message).
Use `user-invocable: false` for background knowledge Claude should apply automatically.

## String Substitutions

| Variable | Description |
|---|---|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` or `$N` | Specific argument by 0-based index |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing the SKILL.md |

## Supporting Files

Keep SKILL.md under 500 lines. Move detail to supporting files:

```
my-skill/
├── SKILL.md           # Main instructions (required, <500 lines)
├── references/
│   └── api-spec.md    # Detailed docs Claude loads when needed
├── examples/
│   └── sample.md      # Example outputs
└── scripts/
    └── helper.sh      # Scripts Claude can execute
```

## Key Principles

1. **Description is critical** — Include trigger phrases ("Use when...", "Triggers on...")
2. **Include "When to Use" / "When NOT to Use"** — Required for quality
3. **Write in imperative voice** — "Do X", not "you should do X"
4. **Scope tool access** — Always set `allowed-tools` to minimum needed
5. **Progressive disclosure** — Core instructions inline, details in references/

## List Skills

```bash
ls -d .claude/skills/*/
```

## Skill + Agent Pairing

After creating a skill, you can preload it into a subagent via `.claude/agents/{agent}.md`:

```yaml
---
name: agent-name
skills:
  - your-new-skill
---
```
