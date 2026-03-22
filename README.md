# brainbrew-devkit

BrainBrew development toolkit — a Claude Code plugin providing agent chains, skills, and automated dev workflows.

## Directory Structure

```
brainbrew-devkit/
  src/            # TypeScript source
  dist/           # Compiled output (gitignored)
  plugin/         # Distributable Claude Code plugin
    .claude-plugin/   # Plugin manifest
    scripts/          # Chain engine (runner, hooks)
    hooks/            # Hook declarations (hooks.json)
    agents/           # Management agents (skill-reviewer, skillhub-manager)
    skills/           # Management skills (chain-builder, skill-creator, etc.)
    config/
      templates/      # Workflow templates
        develop/      # Full dev chain (21 agents, 8 skills)
        review/       # Code review focused
        minimal/      # Clean slate
    CLAUDE.md         # Plugin-level instructions
```

## Development

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run clean      # Remove dist/
```

## Installing as a Claude Code Plugin

The `plugin/` directory is the distributable plugin root. Install it by pointing Claude Code at the `plugin/` directory.

## Architecture

The chain engine uses a hook-driven architecture:

1. **runner.cjs** — Main dispatcher invoked by hooks; reads project config
2. **post-agent.cjs** — Fires after each agent completes; determines next agent
3. **subagent-start.cjs** — Injects context when an agent spawns
4. **subagent-stop.cjs** — Records agent output for chain continuity

Hooks are declared in `plugin/hooks/hooks.json` and reference scripts via `${CLAUDE_PLUGIN_ROOT}`.

## Usage

Initialize a project with a workflow template:

```
/chain-builder bump develop
```

This copies agents, skills, and hook config to `{cwd}/.claude/`.
