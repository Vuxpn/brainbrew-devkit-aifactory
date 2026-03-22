---
name: chain-builder
description: >-
  Set up workflow templates for projects. Trigger when user says:
  "set up a workflow", "create a development workflow", "I need a CI/CD pipeline",
  "set up devops", "initialize project workflow", "bump develop", "bump devops",
  "create agent chain", "set up marketing workflow", "configure dev environment".
  Templates: develop, devops, marketing, research, docs, support, data, moderation, review, minimal.
argument-hint: "bump <template>"
---

# Chain Builder

## EXECUTE THIS EXACT BASH COMMAND

When user says "bump [template]", run this **single bash command** (replace TEMPLATE value):

```bash
TEMPLATE="devops" && PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-/Users/noroom113/company/brainbrewlabs/brainbrew-devkit/plugin}" && mkdir -p .claude/agents .claude/skills .claude/hooks && cp "$PLUGIN_ROOT/config/templates/$TEMPLATE/agents/"*.md .claude/agents/ 2>/dev/null; cp -r "$PLUGIN_ROOT/config/templates/$TEMPLATE/skills/"* .claude/skills/ 2>/dev/null; cp "$PLUGIN_ROOT/config/templates/$TEMPLATE.yaml" .claude/chain-config.yaml && echo "=== Bumped $TEMPLATE ===" && cat .claude/chain-config.yaml && echo "" && echo "Agents:" && ls .claude/agents/*.md 2>/dev/null
```

## CRITICAL RULES

1. **USE BASH ONLY** - Do NOT use Write tool
2. **SINGLE COMMAND** - Run everything in one bash call
3. **USE `cp`** - Copy the YAML file, do NOT write new content
4. The `cp` command copies the FULL config including `flow:` section with routes

## Templates

`develop`, `devops`, `marketing`, `research`, `docs`, `support`, `data`, `moderation`, `review`, `minimal`

## What gets copied

- `agents/*.md` → `.claude/agents/`
- `skills/*` → `.claude/skills/`
- `$TEMPLATE.yaml` → `.claude/chain-config.yaml` (has hooks + flow)
