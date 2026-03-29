# Custom Hooks

Extend the chain engine with custom hook scripts that run at specific lifecycle events.

## Overview

You can inject your own hook scripts alongside the 3 built-in ones (`post-agent`, `subagent-start`, `subagent-stop`). Place scripts in `.claude/hooks/` and register them in your chain config.

## Registering Hooks

Edit your chain file in `.claude/chains/`:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs        # built-in: chain routing
    - ./my-post-validator.js       # your custom script
  SubagentStart:
    - plugin:subagent-start.cjs    # built-in: context injection
    - ./inject-env-context.js      # your custom script
  SubagentStop:
    - plugin:subagent-stop.cjs     # built-in: output verification
  SessionEnd:
    - ./cleanup.js                 # your custom cleanup
```

## Script Path Resolution

| Prefix | Resolves to | Example |
|--------|-------------|---------|
| `plugin:` | Plugin's built-in scripts | `plugin:post-agent.cjs` |
| `./` | `{cwd}/.claude/hooks/` | `./my-hook.js` |
| `/absolute` | Absolute path | `/usr/local/hooks/lint.js` |

## Script Contract

Your script receives the hook event payload via **stdin** (JSON) and communicates back via **stdout** + **exit code**:

| Exit code | stdout | Effect |
|-----------|--------|--------|
| `0` | _(empty)_ | No-op |
| `0` | `{"decision": "block", "reason": "..."}` | Block the tool use |
| `2` | JSON with `hookSpecificOutput` | Inject context into Claude's conversation |
| `0` | Any other text | Pass-through output |

## Example: Inject Context

```js
const stdin = require('fs').readFileSync(0, 'utf-8');
const payload = JSON.parse(stdin);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SubagentStart',
    additionalContext: `<system-reminder>Environment: ${process.env.NODE_ENV}</system-reminder>`,
  },
}));
```

Save this as `.claude/hooks/inject-env-context.js` and register in your chain config.

## Example: Block Dangerous Commands

```js
const stdin = require('fs').readFileSync(0, 'utf-8');
const payload = JSON.parse(stdin);
const cmd = payload.tool_input?.command || '';

if (cmd.includes('deploy') && cmd.includes('production')) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: 'Production deploys require manual approval',
  }));
}
```

Save as `.claude/hooks/block-prod-deploy.js` and add to `PostToolUse` in your chain config.

## Built-in Hooks

### post-agent.cjs (PostToolUse)

Fires after agent completes. Reads `decide:` prompt, calls Haiku, picks next agent.

**Behavior:**
1. Agent completes
2. Load chain config from `.claude/chains/{active}.yaml`
3. If `decide` prompt exists → call Haiku with routing rules
4. Haiku returns `{"route": "agent-name", "reason": "..."}`
5. Emit MANDATORY NEXT STEP instruction

### subagent-start.cjs (SubagentStart)

Injects context when agent spawns.

**Injected Context:**
- Chain state
- Memory Bus messages for this agent
- Previous agent output summary

### subagent-stop.cjs (SubagentStop)

Verifies output quality, blocks incomplete work with retry feedback.

**Quality Checks:**
- Output not empty
- No critical errors
- Task appears complete

### session-end.cjs (SessionEnd)

Cleans up Memory Bus session data. Runs automatically, no config needed.

## Hook Events

| Event | When it fires |
|-------|---------------|
| `PostToolUse` | After any tool completes |
| `SubagentStart` | When a subagent spawns |
| `SubagentStop` | When a subagent completes |
| `SessionEnd` | When Claude Code session ends |
| `PreToolUse` | Before any tool runs |
