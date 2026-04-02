# Caffeine Plugin

Prevents your Mac from sleeping during Claude Code sessions using macOS's built-in `caffeinate` command. Supports multiple tabs, handles crashes gracefully, and cleans up automatically.

## Structure

```
plugins/caffeine/
  plugin.json           ← metadata
  CLAUDE.md            ← this file
  hooks/
    prevent-sleep.sh   ← runs on UserPromptSubmit
    allow-sleep.sh     ← runs on Stop
```

## Install steps

1. Copy the plugin to your project:
   ```bash
   cp -r <plugin-source-path> .claude/plugins/caffeine
   ```

2. Add hooks to `~/.claude/settings.json` (or project `.claude/settings.json`):
   ```json
   {
     "hooks": {
       "UserPromptSubmit": [
         {
           "matcher": ".*",
           "hooks": [
             {
               "type": "command",
               "command": "$HOME/.claude/plugins/caffeine/hooks/prevent-sleep.sh"
             }
           ]
         }
       ],
       "Stop": [
         {
           "matcher": ".*",
           "hooks": [
             {
               "type": "command",
               "command": "$HOME/.claude/plugins/caffeine/hooks/allow-sleep.sh"
             }
           ]
         }
       ]
     }
   }
   ```

3. Make scripts executable:
   ```bash
   chmod +x .claude/plugins/caffeine/hooks/*.sh
   ```

4. Restart Claude Code

## How It Works

- **On prompt submit**: Registers session by PID, cleans stale sessions, restarts `caffeinate` with 1h timeout
- **On session stop**: Unregisters session, kills `caffeinate` only when no active sessions remain

Each session is tracked by its process ID (`$PPID`), so **multiple Claude Code tabs** work correctly. Stale sessions from crashes are automatically cleaned up.

## Requirements

- macOS (uses built-in `caffeinate` command)
- No additional dependencies

## Customize

If the user wants to modify this plugin, copy it into the project:
```bash
cp -r <plugin-source-path> .claude/plugins/caffeine
```
Then edit the scripts directly. Hooks will use the project copy automatically.

## Configuration

The plugin uses `/tmp/claude_caffeinate/` for session tracking:
- `/tmp/claude_caffeinate/sessions/` — session marker files (one per PID)
- `/tmp/claude_caffeinate/pid` — caffeinate process ID

This directory is automatically cleaned up when all sessions end or on reboot.

## Edge Cases Handled

| Scenario | Solution |
|----------|----------|
| Multiple tabs | Each tab has its own session file (`$PPID`), no shared state conflicts |
| Race condition | Per-session files instead of shared counter, no read-modify-write race |
| Claude crash | `-t 3600` timeout auto-kills caffeinate; stale session files cleaned next run |
| Counter drift | No counter — active sessions counted from actual files + process verification |
| Stale sessions | Both scripts prune session files whose process no longer exists |
| Reboot | `/tmp` is cleared automatically by macOS |

## Notes

- `caffeinate -i` prevents idle sleep (not lid-close sleep)
- Each prompt restarts caffeinate with a fresh 1-hour timeout as a safety net
- PID is verified as `caffeinate` before killing to avoid terminating unrelated processes

## Uninstall

1. Remove hooks from `~/.claude/settings.json`
2. Delete plugin directory:
   ```bash
   rm -rf .claude/plugins/caffeine
   ```
3. Clean up any remaining state:
   ```bash
   rm -rf /tmp/claude_caffeinate
   ```

## Credits

Inspired by [Toni Granados's blog post](https://tngranados.com/blog/preventing-mac-sleep-claude-code/) and [Khuong Dev's implementation](https://dev.ngockhuong.com/posts/preventing-mac-sleep-during-claude-code-sessions/).
