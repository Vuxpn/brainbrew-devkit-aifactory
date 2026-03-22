# BrainBrew DevKit Plugin

AI-powered development toolkit for Claude Code — customizable agent chains, modular skills, and automated workflow orchestration.

## Installation

```bash
# Install from GitHub
claude plugins install github:brainbrewlabs/brainbrew-devkit
```

## Quick Start

Just tell Claude what you want:

```
"Set up a development workflow"
"I need a CI/CD pipeline for this project"
"Create a custom agent for API testing"
"Build me a skill for database backups"
```

Or use slash commands:
```bash
/chain-builder bump develop
/skill-creator
```

## Workflow Templates

| Template | Agents | Skills | Chain |
|----------|--------|--------|-------|
| **develop** | 22 | 22 | planner → plan-reviewer → implementer → code-reviewer → tester → git-manager |
| **devops** | 10 | 10 | code-scanner → security-auditor → test-runner → deployer → monitor |
| **marketing** | 6 | 6 | researcher → content-writer → editor → seo-optimizer → publisher → analyzer |
| **research** | 5 | 5 | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| **docs** | 5 | 5 | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| **support** | 5 | 5 | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| **data** | 5 | 5 | data-collector → cleaner → analyzer → visualizer → reporter |
| **moderation** | 5 | 5 | content-scanner → classifier → flagger → reviewer → actioner |
| **review** | 1 | 1 | code-reviewer → END |
| **minimal** | 0 | 0 | hooks only (add your own) |

## AI-Powered Routing

Each template includes intelligent routing rules:

```yaml
flow:
  code-reviewer:
    routes:
      tester: "Code approved"
      implementer: "Code has issues"
      security-scan: "Security concerns"
    decide: |
      If code is APPROVED → "tester"
      If ANY bugs, issues → "implementer"
      If security vulnerabilities → "security-scan"
```

The `decide:` prompt is sent to Haiku AI to analyze agent output and pick the next agent.

## Always Available (Plugin Scope)

**Management Skills:**
- `chain-builder` — bump workflow templates
- `skill-creator` — create new skills
- `skill-improver` — improve existing skills
- `improve-agent` — improve agent definitions
- `skillhub` — search and install skills

**Management Agents:**
- `skill-reviewer` — review skill quality
- `skillhub-manager` — search skills from SkillHub

## How It Works

1. `/chain-builder bump <template>` copies agents, skills, and config to `{cwd}/.claude/`
2. **Plugin hooks** route events through `runner.cjs`
3. **post-agent.cjs** reads `decide:` prompt, calls Haiku, picks next agent
4. Chain continues automatically until END

## Customization

### Create Custom Agent

```markdown
<!-- .claude/agents/my-agent.md -->
---
name: my-agent
description: What this agent does.
tools:
  - Bash
  - Read
  - Edit
---

# My Agent

## Responsibilities
1. Task 1
2. Task 2
```

### Create Custom Skill

```bash
/skill-creator
```

Or manually create `.claude/skills/my-skill/SKILL.md`

### Create Custom Chain

Edit `.claude/chain-config.yaml`:

```yaml
flow:
  agent-a:
    routes:
      agent-b: "Step complete"

  agent-b:
    routes:
      agent-c: "Success"
      agent-a: "Needs retry"
    decide: |
      If SUCCESS → "agent-c"
      If FAILED → "agent-a"

  agent-c:
    routes:
      END: "Done"
```

### Use Cases

| What you want | Just say |
|---------------|----------|
| Dev workflow | "Set up a development workflow" |
| CI/CD pipeline | "I need a CI/CD pipeline" |
| Content workflow | "Create a content marketing workflow" |
| Custom agent | "Create an agent for X" |
| Custom skill | "Build me a skill for Y" |
| Custom chain | "Create a workflow: A → B → C" |
| Find skills | "Find me a skill for testing" |
| Improve agent | "Improve my code-reviewer agent" |
