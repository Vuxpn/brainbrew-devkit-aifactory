# Per-Project Hooks

## Overview

All configuration is project-scoped. Lives in `{cwd}/.claude/`.

## File Structure

```
{cwd}/
  .claude/
    chain-config.yaml    # Hook configuration
    hooks/               # Custom hook scripts
      lint-check.js
    agents/              # Project agents
      planner.md
    skills/              # Project skills
      plan/
```

## chain-config.yaml Format

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs      # From plugin/scripts/
    - ./lint-check.js            # From .claude/hooks/
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs
```

**Path Resolution:**
- `plugin:foo.cjs` → `${CLAUDE_PLUGIN_ROOT}/scripts/foo.cjs`
- `./foo.js` → `{cwd}/.claude/hooks/foo.js`
- `/absolute/path` → as-is

## Supported Events

| Event | When |
|-------|------|
| PreToolUse | Before any tool |
| PostToolUse | After any tool |
| SubagentStart | Agent spawns |
| SubagentStop | Agent finishes |
| Stop | Session ends |
| UserPromptSubmit | User sends message |
| SessionStart | New session |
| SessionEnd | Session closes |

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

  // To inject: console.log(JSON.stringify({...})); process.exit(2);
  // To block:  console.log(JSON.stringify({decision:"block"}));
  // To pass:   process.exit(0);

  process.exit(0);
}
main();
```

## Payload Fields

All events include:
- `session_id` - Session UUID
- `cwd` - Working directory

Event-specific:
- **PostToolUse**: `tool_name`, `tool_input`, `tool_response`
- **SubagentStart**: `agent_type`, `agent_id`, `prompt`
- **SubagentStop**: `agent_type`, `agent_id`, `last_assistant_message`
- **Stop**: `last_assistant_message`, `stop_hook_active`

## Testing

```bash
echo '{"cwd":"/path/to/project","tool_name":"Agent"}' | node .claude/hooks/my-hook.js
```
