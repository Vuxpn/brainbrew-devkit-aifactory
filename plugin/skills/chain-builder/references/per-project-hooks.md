# Per-Project Custom Hooks

## Overview

Custom hooks run per-project alongside the plugin's default chain hooks. They live in `~/.claude/projects/{encoded-path}/` — the same directory Claude Code uses for project data.

## Path Encoding

Encode CWD by replacing `/` with `-`:
```
/Users/me/myapp        → -Users-me-myapp
/Users/me/company/api  → -Users-me-company-api
```

Helper:
```bash
# Encode current directory
echo "$PWD" | sed 's|/|-|g'
```

## File Structure

```
~/.claude/projects/-Users-me-myapp/
├── sessions-index.json     # Claude's own (don't touch)
├── memory/                 # Claude's own (don't touch)
├── chain-config.yaml       # ← Hook routing config
└── custom-hooks/           # ← Hook scripts
    ├── lint-check.js
    └── deploy-notify.js
```

## chain-config.yaml Format

```yaml
# Per-project hook overrides
# Hooks run AFTER plugin defaults (append, not replace)
hooks:
  PostToolUse:
    - custom-hooks/lint-check.js
  SubagentStop:
    - custom-hooks/deploy-notify.js
  Stop:
    - custom-hooks/cleanup.js
```

Supported events: `PostToolUse`, `SubagentStart`, `SubagentStop`, `Stop`

Paths are relative to the project dir (`~/.claude/projects/{encoded}/`).

## Payload Schemas

See `references/hook-payload-schemas.md` for detailed payload structure per event.

Quick reference:
- **PostToolUse**: `tool_name`, `tool_input`, `tool_response`
- **SubagentStart**: `agent_type`, `agent_id`, `prompt`
- **SubagentStop**: `agent_type`, `agent_id`, `last_assistant_message`
- **Stop**: `last_assistant_message`

All payloads include: `session_id`, `cwd`, `stop_hook_active`

## Hook Script Template

```javascript
#!/usr/bin/env node
"use strict";

const fs = require("fs");

function main() {
  let stdin = "";
  try {
    stdin = fs.readFileSync(0, "utf-8").trim();
  } catch { process.exit(0); }
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);

  // Skip if stop_hook_active (prevent infinite loops)
  if (payload.stop_hook_active) process.exit(0);

  // --- Your hook logic here ---

  // To inject context into Claude's response:
  // console.log(JSON.stringify({
  //   continue: true,
  //   hookSpecificOutput: {
  //     hookEventName: "PostToolUse",
  //     additionalContext: "Your message here"
  //   }
  // }));
  // process.exit(2);  // exit 2 = inject context

  // To block:
  // console.log(JSON.stringify({ decision: "block", reason: "..." }));
  // process.exit(0);

  // To pass through silently:
  process.exit(0);
}

main();
```

## How chain-builder Creates Hooks

When user says "add a PostToolUse hook for linting":

### Step 1: Gather Requirements

Ask user to clarify:

| Question | Why | Example Answer |
|----------|-----|----------------|
| What should trigger this hook? | Determine event + filter | "After implementer agent finishes" |
| What should it check/do? | Define the logic | "Run eslint on changed files" |
| What happens on failure? | Block vs warn vs inject | "Block and show errors" |
| Hook name? | File naming | "lint-check" |

### Step 2: Determine Event & Filter

| User Intent | Event | Filter Logic |
|-------------|-------|--------------|
| "After agent X finishes" | `SubagentStop` | `payload.agent_type === 'X'` |
| "Before agent X starts" | `SubagentStart` | `payload.agent_type === 'X'` |
| "After any tool use" | `PostToolUse` | (no filter) |
| "After Agent tool" | `PostToolUse` | `payload.tool_name === 'Agent'` |
| "When session ends" | `Stop` | (no filter) |

### Step 3: Generate Script

Based on gathered requirements, generate script with:
- Correct event filter
- User's logic implemented
- Appropriate output behavior (block/warn/inject)

### Step 4: Create Files

1. **Encode CWD** — `process.cwd()` → encoded path
2. **Ensure directories** — `mkdir -p ~/.claude/projects/{encoded}/custom-hooks/`
3. **Create/update chain-config.yaml** — add event + script path
4. **Create hook script** — from template with user's logic
5. **Show confirmation** — display file paths and test command

## How chain-builder Lists Hooks

When user says "show hooks":

1. **Encode CWD** → find project dir
2. **Read chain-config.yaml** if exists
3. **List custom-hooks/** directory
4. **Display** — table of event → scripts

## How chain-builder Removes Hooks

When user says "remove hook lint-check":

1. **Encode CWD** → find project dir
2. **Remove from chain-config.yaml** — delete the script entry
3. **Delete hook file** — `rm custom-hooks/lint-check.js`
4. **Clean up** — if chain-config.yaml is empty, remove it

## Testing Hooks

```bash
# Test a hook manually with mock payload
echo '{"cwd":"/Users/me/myapp","tool_input":{"subagent_type":"implementer"}}' | node ~/.claude/projects/-Users-me-myapp/custom-hooks/lint-check.js
```

## Important Notes

- Custom hooks run AFTER plugin hooks (append semantics)
- A failing custom hook never breaks plugin hooks (errors → stderr, continue)
- The runner reads `chain-config.yaml` on every hook invocation (no caching)
- Don't modify Claude's own files (sessions-index.json, memory/) in the project dir
