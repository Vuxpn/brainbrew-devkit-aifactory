#!/bin/bash
notify-send "Claude Code" "Task completed" --icon=dialog-information 2>/dev/null || \
  echo -e '\a'
