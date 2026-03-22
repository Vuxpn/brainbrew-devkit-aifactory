# BrainBrew DevKit Plugin

AI-powered development toolkit for Claude Code — customizable agent chains, modular skills, and automated workflow orchestration.

## Installation

```bash
# Install from GitHub
claude plugins install github:brainbrewlabs/brainbrew-devkit
```

## Quick Start

```bash
# Initialize project with a workflow template
/chain-builder bump develop
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

After bumping a template, customize in `.claude/`:
- Edit agents in `.claude/agents/`
- Edit skills in `.claude/skills/`
- Modify flow in `.claude/chain-config.yaml`
