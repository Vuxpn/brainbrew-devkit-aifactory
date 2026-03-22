# Hook Payload Schemas

Reference for payload structure by event type.

## PostToolUse

Fires after any tool completes.

```json
{
  "session_id": "abc123",
  "cwd": "/Users/me/myapp",
  "tool_name": "Agent",
  "tool_input": {
    "subagent_type": "implementer",
    "prompt": "...",
    "description": "..."
  },
  "tool_response": "Agent completed successfully...",
  "last_assistant_message": "I'll implement...",
  "stop_hook_active": false
}
```

**Common filters:**
- `payload.tool_name === 'Agent'` — only Agent tool
- `payload.tool_input?.subagent_type === 'implementer'` — specific agent

## SubagentStart

Fires when a subagent is spawned.

```json
{
  "session_id": "abc123",
  "cwd": "/Users/me/myapp",
  "agent_type": "implementer",
  "agent_id": "agent-xyz",
  "prompt": "Implement the feature..."
}
```

**Common filters:**
- `payload.agent_type === 'implementer'` — specific agent type

## SubagentStop

Fires when a subagent completes.

```json
{
  "session_id": "abc123",
  "cwd": "/Users/me/myapp",
  "agent_type": "implementer",
  "agent_id": "agent-xyz",
  "last_assistant_message": "I have implemented...",
  "stop_hook_active": false
}
```

**Common filters:**
- `payload.agent_type === 'tester'` — after tester finishes
- `payload.last_assistant_message.includes('FAIL')` — on failure

## Stop

Fires when main session is about to stop.

```json
{
  "session_id": "abc123",
  "cwd": "/Users/me/myapp",
  "last_assistant_message": "Done! I have...",
  "stop_hook_active": false
}
```

## Output Contract

### Pass through (do nothing)
```javascript
process.exit(0);
```

### Inject context into Claude's response
```javascript
console.log(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: "Your message here"
  }
}));
process.exit(2);
```

### Block the action
```javascript
console.log(JSON.stringify({
  decision: "block",
  reason: "Lint errors found"
}));
process.exit(0);
```
