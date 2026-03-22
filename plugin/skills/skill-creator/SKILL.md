---
name: skill-creator
description: >-
  Create skills. Trigger when user says:
  "create a skill for X", "build me a skill", "I need a skill that does Y",
  "make a deployment skill", "list skills", "show my skills".
---

# Skill Management

## Create Skill

**Use MCP tool `create_skill`:**

```
mcp__brainbrew__create_skill(
  name: "deploy-aws",
  description: "Deploy application to AWS. Trigger on 'deploy to aws', 'push to production'",
  content: "## Steps\n1. Build app\n2. Push to S3\n3. Invalidate CloudFront"
)
```

## List Skills

```
mcp__brainbrew__list_skills()
```

## Natural Language → MCP

| User says | MCP call |
|-----------|----------|
| "Create a skill for deployment" | `create_skill(name: "deploy", ...)` |
| "I need a database migration skill" | `create_skill(name: "db-migrate", ...)` |
| "What skills do I have?" | `list_skills()` |
| "Show my skills" | `list_skills()` |

## Skill Structure

Skills are markdown files in `.claude/skills/NAME/SKILL.md`:

```markdown
---
name: skill-name
description: >-
  When to trigger this skill. Use natural language patterns
  like "deploy to X", "run Y", "create Z".
---

# Skill Name

## Steps
1. Step 1
2. Step 2

## Commands
\`\`\`bash
# example commands
\`\`\`
```
