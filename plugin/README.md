# BrainBrew DevKit Plugin

AI-powered development toolkit for Claude Code -- customizable agent chains, modular skills, and automated workflow orchestration.

## What This Plugin Provides

### Agent Chain Engine

Automated workflow orchestration via hook-driven agent chaining. Define multi-step development workflows that execute automatically:

```
planner -> plan-reviewer -> implementer -> code-reviewer -> tester -> git-manager
```

Failed steps automatically route to the appropriate recovery agent (debugger, re-plan, re-implement).

### 22 Specialized Agents

Pre-built agent definitions for common development tasks:

- **Planning**: planner, plan-reviewer, project-manager
- **Implementation**: implementer, code-reviewer, debugger, tester
- **Documentation**: docs-manager, doc-orchestrator, doc-transformer, doc-verifier
- **Research**: researcher, scout, scout-external, brainstormer
- **Utilities**: git-manager, mcp-manager, copywriter, journal-writer, skill-reviewer, ui-ux-designer

### 12 Modular Skills

Reusable skill definitions that agents load for specialized workflows:

- `plan` -- structured planning methodology
- `plan-review` -- plan quality assessment
- `code` -- code implementation patterns
- `improve-agent` -- agent definition improvement
- `skill-improver` -- skill definition improvement
- `skill-creator` -- create new skill definitions
- `chain-builder` -- build custom agent chains
- `git-commit` -- structured git commit workflow
- `systematic-debugging` -- methodical debugging approach
- `requesting-code-review` -- code review request formatting
- `brainstorming` -- structured ideation
- `sequential-thinking` -- step-by-step reasoning

## How It Works

The plugin uses Claude Code's hook system to orchestrate agent chains:

1. **hooks.json** declares PostToolUse and SubagentStart/Stop hooks
2. **scripts/** contains the chain engine (runner, post-agent, subagent lifecycle)
3. **agents/** contains agent definitions loaded as subagent types
4. **skills/** contains skill definitions referenced by agents
5. **CLAUDE.md** injects the chain protocol into every session

## Customization

- Add new agents by creating `.md` files in `agents/`
- Add new skills by creating directories in `skills/` with a `SKILL.md`
- Modify chain flows in `config/chain-config.json`
- Create project-specific chains in `config/dev-chain.yaml`
