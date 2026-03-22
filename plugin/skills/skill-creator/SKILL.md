---
name: skill-creator
description: >-
  Create skills. Trigger when user says:
  "create a skill for X", "build me a skill", "I need a skill that does Y",
  "make a deployment skill", "list skills", "show my skills".
---

# Skill Management

## Create Skill

Write directly to `.claude/skills/{name}/SKILL.md`:

```markdown
---
name: skill-name
description: >-
  When to trigger this skill. Include natural language patterns:
  "deploy to X", "run migrations", "test API endpoints".
---

# Skill Name

## Domain Knowledge

[Specific knowledge the agent needs - architecture, patterns, conventions]

## Procedures

1. Step 1 - what to do
2. Step 2 - what to do

## Commands

\`\`\`bash
# Common commands for this skill
\`\`\`

## References

[Links to docs, specs, etc.]
```

## Key Principles

1. **Description is critical** - Include natural language triggers
2. **Domain knowledge** - What can't be derived from code
3. **Procedures** - Step-by-step, not generic
4. **Pair with agent** - Add skill name to agent's `skills:` frontmatter

## List Skills

```bash
ls -d .claude/skills/*/
```

## Skill + Agent Pairing

After creating a skill, attach it to the agent in `.claude/agents/{agent}.md`:

```yaml
---
name: agent-name
skills:
  - your-new-skill   # ← add here
---
```
