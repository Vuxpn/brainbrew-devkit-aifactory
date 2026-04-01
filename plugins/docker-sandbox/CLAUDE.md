# docker-sandbox

Intercepts Bash tool calls and runs commands inside a Docker container.
Useful for teams that need isolation — commands never touch the host machine.

## How it works
PreToolUse hook intercepts the Bash tool → reruns command in Docker → exits with code 2
(exit 2 tells Claude Code to use the hook output instead of running the original command)

## Install steps
1. Ensure Docker is running: docker info
2. chmod +x hooks/pre-bash.sh
3. Add to .claude/hooks.json:
   - PreToolUse (matcher: Bash) → hooks/pre-bash.sh

## Configuration (env vars)
DOCKER_SANDBOX_IMAGE=ubuntu:22.04   ← container image to use
DOCKER_SANDBOX_NETWORK=none         ← network mode (none = fully isolated)

Set in .env or export before running Claude Code.

## Requirements
- Docker Desktop or Docker Engine

## Customize
This plugin is designed to be customized per project.
Copy to .claude/plugins/docker-sandbox/ and modify:
- Change the image to match your stack (node:20, python:3.12, etc.)
- Mount additional volumes (secrets, caches)
- Add resource limits (--memory, --cpus)
Example: cp -r <plugin-source-path> .claude/plugins/docker-sandbox/
