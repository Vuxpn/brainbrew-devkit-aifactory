---
name: chain-builder
description: Create and manage agent chains + hooks per-project. Use when user says "bump template", "bump develop", "bump devops", "add hook", "show hooks", or wants to customize agent workflow.
argument-hint: "[bump <template> | add <event> <hook> | show]"
---

# Chain Builder

**IMPORTANT: Everything is PROJECT-SCOPED (cwd). Do NOT use ~/.claude/chains/ or ~/.claude/projects/.**

## Available Templates

Templates are in `${CLAUDE_PLUGIN_ROOT}/config/templates/`:

| Template | Agents | Skills | Use Case |
|----------|--------|--------|----------|
| develop | 21 | 21 | Software development |
| marketing | 6 | 6 | Content marketing |
| devops | 5 | 5 | CI/CD pipelines |
| research | 5 | 5 | Research workflow |
| docs | 5 | 5 | Documentation |
| support | 5 | 5 | Customer support |
| data | 5 | 5 | Data pipelines |
| moderation | 5 | 5 | Content moderation |
| review | 1 | 1 | Code review |
| minimal | 0 | 0 | Clean slate |

## Bump Template

**When user says "bump [template]", execute these commands:**

```bash
# Get plugin root (use actual path from env or hardcode)
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-/path/to/plugin}"
TEMPLATE="[template_name]"  # e.g., devops, develop, marketing

# 1. Create directories in CWD
mkdir -p .claude/agents .claude/skills .claude/hooks

# 2. Copy agents from template
cp "$PLUGIN_ROOT/config/templates/$TEMPLATE/agents/"*.md .claude/agents/ 2>/dev/null || true

# 3. Copy skills from template
cp -r "$PLUGIN_ROOT/config/templates/$TEMPLATE/skills/"* .claude/skills/ 2>/dev/null || true

# 4. Write chain-config.yaml
cat > .claude/chain-config.yaml << 'EOF'
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs
EOF

# 5. Show result
echo "Bumped $TEMPLATE template to $(pwd)/.claude/"
ls .claude/agents/ 2>/dev/null | wc -l | xargs echo "Agents:"
ls .claude/skills/ 2>/dev/null | wc -l | xargs echo "Skills:"
```

## Show Current Config

```bash
cat .claude/chain-config.yaml 2>/dev/null || echo "No config"
echo "Agents:" && ls .claude/agents/ 2>/dev/null || echo "  (none)"
echo "Skills:" && ls .claude/skills/ 2>/dev/null || echo "  (none)"
```

## Add Custom Hook

1. Create `.claude/hooks/{name}.js`
2. Add `- ./{name}.js` to `.claude/chain-config.yaml` under the event

## Config Format

```yaml
# .claude/chain-config.yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs    # From plugin/scripts/
    - ./my-hook.js             # From .claude/hooks/
```

## DO NOT

- Do NOT read from `~/.claude/chains/`
- Do NOT read from `~/.claude/projects/`
- Do NOT use global config
- Everything is in `{cwd}/.claude/`
