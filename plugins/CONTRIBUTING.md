# Creating a Plugin

A plugin is a directory under `plugins/` with two required files and your hook scripts.

## Minimal structure

```
plugins/your-plugin/
  plugin.json   ← required: metadata for search
  CLAUDE.md     ← required: instructions for the AI
  hooks/        ← your scripts (bash, python, js, binary, etc.)
```

## `plugin.json` fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique plugin name (kebab-case) |
| `description` | yes | One-line description (shown in search) |
| `version` | yes | Semver |
| `author` | yes | Your GitHub username |
| `runtime` | yes | `bash`, `python`, `node`, `rust`, `docker` |
| `keywords` | yes | Array of search terms |

Example:
```json
{
  "name": "my-plugin",
  "description": "Does something useful during Claude Code sessions",
  "version": "1.0.0",
  "author": "your-github-username",
  "runtime": "bash",
  "keywords": ["productivity", "macos"]
}
```

## `CLAUDE.md` — the most important file

This is what the AI reads to understand and install your plugin.
Write it as instructions addressed to the AI, not to a human.

Required sections:
- What the plugin does (1-2 sentences)
- `## Structure` — what files are in the plugin and what they do
- `## Install steps` — exactly what the AI must do to activate the plugin
- `## Requirements` — what must be installed on the user's machine
- `## Customize` — how to copy to project for editing

Optional sections:
- `## Configuration` — env vars or config files
- `## Logs` — where output is written
- `## Uninstall` — how to remove

## Runtimes

### Bash
- Scripts run directly, no build step
- Handle cross-platform by using `hooks/macos/`, `hooks/linux/`, `hooks/windows/`
- Use `#!/bin/bash` shebang

### Python
- Scripts run with `python3`, no build step
- stdlib only preferred (no pip install at runtime)
- Use `#!/usr/bin/env python3` shebang

### Node/TypeScript
- Bundle everything into a single `.cjs` using tsup
- Commit the bundled file — users should not need to run `npm install`
- Use `noExternal` in tsup config to bundle all dependencies

### Rust
- Commit pre-compiled binaries in `bin/macos/`, `bin/linux/`, `bin/windows/`
- Include `src/` and `Cargo.toml` for contributors who want to rebuild
- Optionally provide a `hooks/run-docker.sh` as a fallback

### Docker
- Provide a shell script that runs `docker run ...`
- Mount the working directory as `/workspace`
- Document the image name and any required env vars

## Hook events

| Event | Use when |
|-------|----------|
| `PreToolUse` | Intercept a tool before it runs (exit 2 to replace output) |
| `PostToolUse` | React after a tool completes |
| `UserPromptSubmit` | Trigger on each user message |
| `SessionStart` | Session is starting |
| `SessionEnd` | Session has ended (cleanup, summaries) |
| `Stop` | Claude stops responding (end of a turn) |
| `SubagentStart` | A subagent is spawned |
| `SubagentStop` | A subagent has finished |
| `Notification` | Claude sends a notification to the user |

## Customize section template

Add this to every `CLAUDE.md`:

```markdown
## Customize
If the user wants to modify this plugin, copy it into the project:
  cp -r <plugin-source-path> .claude/plugins/your-plugin/
Then edit the scripts directly. Hooks will use the project copy automatically.
```

The AI will replace `<plugin-source-path>` with the actual path at install time.

## Submitting

1. Add your plugin under `plugins/your-plugin/`
2. Test it works locally
3. Submit a PR — title: `feat(plugins): add your-plugin`

## Examples

| Plugin | Runtime | Learn from |
|--------|---------|------------|
| `notify` | bash | Cross-platform scripts, no build |
| `cost-tracker` | python | stdlib only, session hooks |
| `session-auditor` | node/ts | Bundled .cjs, external API |
| `fast-diff` | rust | Pre-compiled binary + Docker fallback |
| `docker-sandbox` | bash | PreToolUse interception |
