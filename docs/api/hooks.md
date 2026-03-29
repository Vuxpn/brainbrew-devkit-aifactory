# Hooks Reference

Built-in hooks that power the chain engine.

## PostToolUse: post-agent.cjs

Fires after agent completes. Reads `decide:` prompt, calls Haiku, picks next agent.

**Behavior:**

1. Agent completes
2. Load chain config from `.claude/chains/{active}.yaml`
3. If `decide` prompt exists → call Haiku with routing rules
4. Haiku returns `{"route": "agent-name", "reason": "..."}`
5. Emit MANDATORY NEXT STEP instruction

## SubagentStart: subagent-start.cjs

Injects context when agent spawns.

**Injected Context:**

- Chain state
- Memory Bus messages for this agent
- Previous agent output summary

## SubagentStop: subagent-stop.cjs

Verifies output quality, blocks incomplete work with retry feedback.

**Quality Checks:**

- Output not empty
- No critical errors
- Task appears complete

## SessionEnd: session-end.cjs

Cleans up Memory Bus session data. Runs automatically, no config needed.

## Custom Hooks

Place scripts in `.claude/hooks/` and register in chain config:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
    - ./my-validator.js
```

## Hook Contract

Your script receives the hook event payload via **stdin** (JSON) and communicates back via **stdout** + **exit code**:

| Exit code | stdout | Effect |
|-----------|--------|--------|
| `0` | _(empty)_ | No-op |
| `0` | `{"decision": "block", "reason": "..."}` | Block the tool use |
| `2` | JSON with `hookSpecificOutput` | Inject context |
| `0` | Any other text | Pass-through output |

## Script Path Resolution

| Prefix | Resolves to | Example |
|--------|-------------|---------|
| `plugin:` | Plugin's built-in scripts | `plugin:post-agent.cjs` |
| `./` | `{cwd}/.claude/hooks/` | `./my-hook.js` |
| `/absolute` | Absolute path | `/usr/local/hooks/lint.js` |

## Example: Context Injection Hook

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

## Example: Blocking Hook

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

## Hook Events

| Event | When it fires |
|-------|---------------|
| `PostToolUse` | After any tool completes |
| `SubagentStart` | When a subagent spawns |
| `SubagentStop` | When a subagent completes |
| `SessionEnd` | When Claude Code session ends |
| `PreToolUse` | Before any tool runs |
