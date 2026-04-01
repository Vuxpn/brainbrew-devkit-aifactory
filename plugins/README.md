# Plugins

Optional plugins that extend Claude Code sessions.
Discoverable via the `plugin_list` MCP tool.

## Available plugins

| Plugin | Runtime | Description |
|--------|---------|-------------|
| [notify](notify/) | bash | OS notification when Claude finishes a task |
| [cost-tracker](cost-tracker/) | python | Track token usage and estimate API cost |
| [session-auditor](session-auditor/) | node/ts | AI-powered session logger using Haiku |
| [fast-diff](fast-diff/) | rust | Git diff summary at session end |
| [docker-sandbox](docker-sandbox/) | bash | Run bash commands inside Docker for isolation |

## Install a plugin

Use the MCP tool from brainbrew-devkit:

```
plugin_list()                     # browse all plugins
plugin_list(query: "docker")      # search by keyword
```

The AI reads the plugin's `CLAUDE.md` and handles installation automatically.

## Want to customize a plugin?

Tell the AI: "I want to customize the cost-tracker plugin."
It will copy it into your project at `.claude/plugins/cost-tracker/`
where you can edit it freely.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to create your own plugin.
