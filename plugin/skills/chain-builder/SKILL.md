---
name: chain-builder
description: Create and manage agent chains + hooks per-project. Use when user says "bump template", "bump develop", "add hook", "show hooks", "show chain", or wants to customize agent workflow for current project.
argument-hint: "[bump <template> | add <event> <hook> | show | ...]"
---

# Chain Builder

Build and manage agent chains + hooks. Everything is **project-scoped** (cwd).

## Architecture

```
{cwd}/
  .claude/
    chain-config.yaml    # Hook configuration
    hooks/               # Custom hook scripts
    agents/              # Project agents (from template)
    skills/              # Project skills (from template)
```

## Bump Template

Initialize project from a template. Copies agents, skills, and hook config.

### Available Templates

```
plugin/config/templates/
  develop/         # Full dev chain
    agents/        # 21 agents
    skills/        # 8 skills
  review/          # Code review focused
  minimal/         # Clean slate
```

### Bump Process

When user says "bump develop":

```bash
# 1. Create directories
mkdir -p .claude/{agents,skills,hooks}

# 2. Copy agents from template
cp ${CLAUDE_PLUGIN_ROOT}/config/templates/develop/agents/*.md .claude/agents/

# 3. Copy skills from template
cp -r ${CLAUDE_PLUGIN_ROOT}/config/templates/develop/skills/* .claude/skills/

# 4. Write hook config (from develop.yaml)
cat > .claude/chain-config.yaml << 'EOF'
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs
EOF

# 5. Show summary
echo "Bumped develop template:"
echo "  Agents: $(ls .claude/agents/*.md | wc -l)"
echo "  Skills: $(ls -d .claude/skills/*/ | wc -l)"
```

## Show Current Config

```bash
cat .claude/chain-config.yaml
echo "Agents:" && ls .claude/agents/
echo "Skills:" && ls .claude/skills/
```

Dev chain diagram:
```
planner → plan-reviewer → implementer → code-reviewer → tester → git-manager
              ↓ ISSUES        ↓ ISSUES        ↓ FAIL
            planner        implementer      debugger → implementer
```

## Add Custom Hook

1. **Ask user:**
   - What event? (PostToolUse, SubagentStart, SubagentStop, Stop)
   - What should it do?
   - Hook name?

2. **Create script** at `.claude/hooks/{name}.js`

3. **Update config** - add `./name.js` to `.claude/chain-config.yaml`

## Config Path Resolution

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs    # → ${CLAUDE_PLUGIN_ROOT}/scripts/
    - ./my-hook.js             # → {cwd}/.claude/hooks/
```

## Hook Script Template

```javascript
#!/usr/bin/env node
const fs = require("fs");

function main() {
  const stdin = fs.readFileSync(0, "utf-8").trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  if (payload.stop_hook_active) process.exit(0);

  // Your logic here

  process.exit(0);
}
main();
```

## Payload Reference

| Event | Key Fields |
|-------|-----------|
| PostToolUse | `tool_name`, `tool_input`, `tool_response` |
| SubagentStart | `agent_type`, `agent_id`, `prompt` |
| SubagentStop | `agent_type`, `agent_id`, `last_assistant_message` |
| Stop | `last_assistant_message`, `stop_hook_active` |

## Rules

- Everything is project-scoped (no global)
- Bump template to initialize
- `plugin:` scripts are from plugin (immutable)
- `./` scripts are local (editable)
- Agents/skills in `.claude/` are project-specific
- Always show result after changes
