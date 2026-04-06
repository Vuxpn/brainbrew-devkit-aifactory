# Safety Guard Plugin

Blocks dangerous commands before execution using PreToolUse hooks. Catches `rm -rf`, `git push --force`, `DROP TABLE`, `curl | bash`, and more.

## Structure

```
plugins/safety-guard/
  plugin.json       ← metadata
  CLAUDE.md         ← this file
  hooks/
    guard.js        ← runs on PreToolUse (Bash)
```

## Install

### Option A: Via `.claude/hooks.yaml` (recommended)

1. Copy plugin to project:
   ```bash
   cp -r <plugin-source-path> .claude/plugins/safety-guard
   ```

2. Add to `.claude/hooks.yaml`:
   ```yaml
   PreToolUse:
     - ./../plugins/safety-guard/hooks/guard.js
   ```

### Option B: Via `settings.json`

Add hooks to `~/.claude/settings.json` (or project `.claude/settings.json`):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $HOME/.claude/plugins/safety-guard/hooks/guard.js"
          }
        ]
      }
    ]
  }
}
```

## Blocked Patterns

| Category | Patterns |
|----------|----------|
| File deletion | `rm -rf`, `rm -r ~/` |
| Git destructive | `git push --force`, `git reset --hard`, `git clean -f`, `git checkout .`, `git branch -D` |
| SQL destructive | `DROP TABLE/DATABASE/SCHEMA`, `TRUNCATE TABLE` |
| System dangerous | `chmod/chown -R /`, `kill -9`, `mkfs`, `dd to device` |
| Remote execution | `curl \| bash`, `wget \| sh` |

## Customize

Copy to project and edit `hooks/guard.js` to add/remove patterns:

```javascript
{ pattern: /your-regex/i, label: 'description' }
```

## Uninstall

1. Remove from `.claude/hooks.yaml` or `settings.json`
2. Delete plugin: `rm -rf .claude/plugins/safety-guard`
