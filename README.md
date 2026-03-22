# brainbrew-devkit

BrainBrew development toolkit — a Claude Code plugin providing agent chains, skills, and automated dev workflows.

## Features

- **10 workflow templates** with pre-configured agent chains
- **AI-powered routing** — Haiku analyzes agent output to pick the next step
- **Flexible flows** — Multiple routes per agent, conditional branching
- **60+ agents** and **60+ skills** across all templates

## Quick Start

```bash
# Install plugin
claude plugins install /path/to/brainbrew-devkit

# Bump a template to your project
/chain-builder bump develop
```

## Workflow Templates

| Template | Agents | Chain |
|----------|--------|-------|
| **develop** | 22 | planner → plan-reviewer → implementer → code-reviewer → tester → git-manager |
| **devops** | 10 | code-scanner → security-auditor → test-runner → deployer → monitor |
| **marketing** | 6 | researcher → content-writer → editor → seo-optimizer → publisher → analyzer |
| **research** | 5 | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| **docs** | 5 | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| **support** | 5 | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| **data** | 5 | data-collector → cleaner → analyzer → visualizer → reporter |
| **moderation** | 5 | content-scanner → classifier → flagger → reviewer → actioner |
| **review** | 1 | code-reviewer → END |
| **minimal** | 0 | hooks only (add your own) |

## Flow Config

Each template includes a `flow:` section with AI-powered routing:

```yaml
flow:
  code-reviewer:
    routes:
      tester: "Code approved, ready for testing"
      implementer: "Code has issues, needs fixes"
      security-scan: "Security concerns found"
    decide: |
      If code is APPROVED → "tester"
      If ANY bugs, issues → "implementer"
      If security vulnerabilities → "security-scan"
```

- **routes:** Maps agent names to descriptions (multiple routes allowed)
- **decide:** AI prompt sent to Haiku to pick which route based on output

## Directory Structure

```
brainbrew-devkit/
  src/              # TypeScript source
  dist/             # Compiled output
  plugin/           # Distributable Claude Code plugin
    scripts/        # Chain engine (runner, hooks)
    hooks/          # Hook declarations
    agents/         # Management agents
    skills/         # Management skills (chain-builder, skill-creator, etc.)
    config/
      templates/    # Workflow templates
        develop/    # Full dev chain
        devops/     # CI/CD pipeline
        marketing/  # Content marketing
        ...
```

## Development

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run dev        # Watch mode
```

## Architecture

Hook-driven chain engine:

1. **post-agent.cjs** — Fires after agent completes; reads `decide:` prompt, calls Haiku, picks next agent
2. **subagent-start.cjs** — Injects context when agent spawns
3. **subagent-stop.cjs** — Records output for chain continuity

Flow config is read from `{cwd}/.claude/chain-config.yaml`.
