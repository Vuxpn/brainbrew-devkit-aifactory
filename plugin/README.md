# BrainBrew DevKit Plugin

AI-powered development toolkit for Claude Code — customizable agent chains, modular skills, and automated workflow orchestration.

## What This Plugin Provides

### Always Available (Plugin Scope)

**5 Management Skills:**
- `chain-builder` — build/manage agent chains + hooks
- `skill-creator` — create new skills
- `skill-improver` — improve existing skills
- `improve-agent` — improve agent definitions
- `skillhub` — search and install skills from SkillHub

**2 Management Agents:**
- `skill-reviewer` — review skill quality
- `skillhub-manager` — search skills from SkillHub

### Templates (Bump to Project)

Use `/chain-builder bump <template>` to initialize a project with a workflow.

| Template | Agents | Skills | Description |
|----------|--------|--------|-------------|
| `develop` | 21 | 8 | Full dev chain (planner → tester → git) |
| `review` | 1 | 1 | Code review focused |
| `minimal` | 0 | 0 | Clean slate |

**develop template includes:**
- Agents: planner, plan-reviewer, implementer, code-reviewer, tester, git-manager, debugger, researcher, scout, brainstormer, docs-manager, and more
- Skills: plan, code, git-commit, systematic-debugging, brainstorming, sequential-thinking

## Quick Start

```bash
# Initialize project with develop workflow
/chain-builder bump develop
```

This creates:
```
{cwd}/
  .claude/
    chain-config.yaml    # Hook configuration
    agents/              # 21 agents copied
    skills/              # 8 skills copied
```

## How It Works

1. **Plugin hooks** (always active) route events to `runner.cjs`
2. **runner.cjs** reads `{cwd}/.claude/chain-config.yaml`
3. **Scripts** execute based on config (plugin: or local ./)
4. **Agents/skills** in `.claude/` are used by Claude

## Per-Project Hooks

### chain-config.yaml

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs      # From plugin/scripts/
    - ./my-hook.js               # From .claude/hooks/
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs
```

### Add Custom Hook

1. Create `.claude/hooks/my-hook.js`
2. Add `./my-hook.js` to `.claude/chain-config.yaml`

## Customization

Everything is project-scoped:
- Edit agents in `.claude/agents/`
- Edit skills in `.claude/skills/`
- Add hooks in `.claude/hooks/`
- Configure in `.claude/chain-config.yaml`

Use `/chain-builder` for guided customization.
