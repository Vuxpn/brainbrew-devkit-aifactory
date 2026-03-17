# Brainbrew DevKit

A comprehensive AI-powered development kit built on [Claude Code](https://docs.anthropic.com/en/docs/claude-code), providing a full AI software development team with specialized agents, modular skills, automated hooks, and structured workflows.

## Overview

Brainbrew DevKit turns Claude Code into an orchestrated development team — planning, implementing, reviewing, testing, debugging, and documenting code through a chain of specialized agents guided by quality gates and event-driven automation.

## Features

- **15 specialized agents** — one for each stage of the software development lifecycle
- **23 modular skills** — domain-specific workflows loaded progressively for token efficiency
- **Event-driven hooks** — automated verification, quality assurance, and learning capture
- **Chain verification** — per-agent output quality gates with retry guidance
- **Structured workflows** — primary development cycle, orchestration protocols, and documentation management

## Repository Structure

```
.claude/
├── agents/          # Specialized subagents (planner, implementer, tester, etc.)
├── skills/          # Modular capability extensions
├── hooks/           # Event-driven automation (PostToolUse, SubagentStart/Stop, etc.)
│   └── chains/      # Chain verification scripts and configuration
├── workflows/       # Development process documentation and protocols
└── settings.json    # Main configuration
```

## Agents

| Agent | Role |
|---|---|
| `planner` | Creates research-backed implementation plans |
| `implementer` | Writes clean, production-ready code |
| `code-reviewer` | Multi-dimensional quality assessment (security, performance, style) |
| `tester` | Unit, integration, E2E, and CI/CD test orchestration |
| `debugger` | Root-cause analysis via logs, DB queries, and performance profiling |
| `researcher` | Multi-source technical research coordination |
| `project-manager` | Progress tracking, roadmap, and report consolidation |
| `git-manager` | Conventional commits, staging, and push |
| `docs-manager` | Keeps documentation in sync with implementation |
| `plan-reviewer` | Validates plans for completeness and feasibility |
| `brainstormer` | Ideation and solution exploration |
| `scout` | Fast parallel codebase search |
| `mcp-manager` | MCP server integration management |

## Skills

Skills are invoked via `/skill-name` and loaded progressively to optimize token usage:

| Skill | Description |
|---|---|
| `/plan` | Technical implementation planning (use `fast` for quick plans) |
| `/code` | Start coding from an existing plan |
| `/research` | Multi-source technical research |
| `/code-review` | Code review reception and verification workflows |
| `/debugging` | Systematic root-cause debugging |
| `/problem-solving` | Advanced techniques for complex problems |
| `/test` | Testing orchestration |
| `/docs` | Documentation management and search |
| `/fix` | Bug fix workflows (`logs` for log-based, `fast` for quick) |
| `/git` | Git operations (`commit`, `push`, `pr`) |
| `/review` | Code quality assessment (`codebase` for full scan) |
| `/scout` | Fast parallel codebase exploration |
| `/ask` | Technical and architectural Q&A |
| `/brainstorm` | Feature brainstorming |
| `/watzup` | Review recent changes and wrap up work |

## Development Workflow

The primary workflow follows a sequential chain with parallel research steps:

```
Planning       → planner (+ parallel researcher agents)
Plan Review    → plan-reviewer
Implementation → implementer (+ scout for codebase analysis)
Code Review    → code-reviewer
Testing        → tester
Debugging      → debugger → implementer (loop until passing)
Documentation  → docs-manager
Git            → git-manager
Project Mgmt   → project-manager
```

Plans are saved to `./plans/`, documentation is maintained in `./docs/`.

## Configuration

**Model stack** (configured in `.claude/settings.json`):

| Purpose | Model |
|---|---|
| Default | `claude-opus-4-5` |
| Lightweight orchestration | `claude-haiku-4-5` |
| Code review / testing | `claude-sonnet-*` |

**Environment variables:**

```json
{
  "ANTHROPIC_MODEL": "claude-opus-4-5",
  "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5",
  "API_TIMEOUT_MS": "10000"
}
```

Local settings (`.claude/settings.local.json`) are gitignored and can override permissions and MCP directory access without affecting shared configuration.

## Code Standards

- **File size:** 200-line limit per file — split larger files
- **Naming:** kebab-case, descriptive names
- **Comments:** only for non-obvious logic; code should be self-documenting
- **Commits:** conventional format `type(scope): description` (<72 chars, present tense)
- **No secrets:** never hardcode API keys or credentials

## Hooks

Hooks automate quality and lifecycle events:

- **PostToolUse (Write/Edit):** triggers modularization checks
- **PostToolUse (Agent):** runs chain verification against per-agent output rules
- **SubagentStart:** initializes AI verification context
- **SubagentStop:** captures learnings from agent work
- **Stop:** logs errors for review

Chain verification rules are defined in `.claude/hooks/chains/chain-config.json` (v2.0).

## Getting Started

1. Clone this repository into your project as `.claude/` or alongside your codebase
2. Copy `.claude/settings.json` to your project's `.claude/` directory
3. Create `.claude/settings.local.json` for local overrides (already gitignored)
4. Start a task with `/plan` or ask the planner agent directly

```bash
# Example: start a feature with the planning skill
/plan add user authentication with JWT tokens
```

