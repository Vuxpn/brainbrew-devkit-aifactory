# brainbrew-devkit

BrainBrew development toolkit - a Claude Code plugin providing agent chains, skills, and automated dev workflows.

## Directory Structure

```
brainbrew-devkit/
  src/            # TypeScript source (future chain engine rewrite)
  dist/           # Compiled output (gitignored)
  plugin/         # Distributable Claude Code plugin
    .claude-plugin/   # Plugin manifest
    scripts/          # Chain engine (runner, hooks)
    hooks/            # Hook declarations (hooks.json)
    agents/           # Agent definitions
    skills/           # Skill definitions
    config/           # Chain and workflow config
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

1. **runner.js** - Main dispatcher invoked by hooks; routes to handler scripts based on hook type
2. **post-agent.js** - Fires after each agent completes; determines the next agent in the chain
3. **subagent-start.js** - Injects context (plan, phase, role instructions) when an agent spawns
4. **subagent-stop.js** - Records agent output for chain continuity
5. **error-logger.js** - Captures errors for debugging

Hooks are declared in `plugin/hooks/hooks.json` and reference scripts via `${CLAUDE_PLUGIN_ROOT}`.
