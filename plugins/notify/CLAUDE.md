# notify

Sends an OS notification when Claude finishes a task.
No dependencies — uses native OS notification APIs.

## Structure
hooks/macos/notify.sh   → osascript (built-in)
hooks/linux/notify.sh   → notify-send
hooks/windows/notify.ps1 → Windows Forms balloon tip

## Install steps
1. Detect platform
2. Copy matching script to .claude/plugins/notify/
3. chmod +x the .sh file (mac/linux)
4. Add to .claude/hooks.json:
   - Stop → notify script

## Requirements
- macOS: built-in, no install needed
- Linux: `notify-send` (apt install libnotify-bin)
- Windows: PowerShell (built-in)

## Customize
If the user wants to modify this plugin, copy it into the project:
  cp -r <plugin-source-path> .claude/plugins/notify/
Then edit the scripts directly. Hooks will use the project copy automatically.
