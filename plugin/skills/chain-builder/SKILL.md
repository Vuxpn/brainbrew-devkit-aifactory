---
name: chain-builder
description: >-
  Set up workflow templates and manage chain flows. Trigger when user says:
  "set up a workflow", "create a development workflow", "I need a CI/CD pipeline",
  "set up devops", "bump develop", "bump devops", "add agent to chain",
  "show chain flow", "edit chain config", "create custom workflow".
---

# Chain Builder

## Set Up a Workflow Template

**Use MCP tool:**

```
mcp__brainbrew__bump_template(template: "develop")
```

### Templates

| Template | Chain |
|----------|-------|
| `develop` | planner → plan-reviewer → implementer → code-reviewer → tester → git-manager |
| `devops` | code-scanner → security-auditor → test-runner → deployer → monitor |
| `marketing` | researcher → content-writer → editor → seo-optimizer → publisher |
| `research` | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| `docs` | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| `support` | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| `data` | data-collector → cleaner → analyzer → visualizer → reporter |
| `moderation` | content-scanner → classifier → flagger → reviewer → actioner |
| `review` | code-reviewer → END |
| `minimal` | hooks only (add your own) |

## Show Chain Flow

Read directly:
```bash
cat .claude/chain-config.yaml
```

## Add Agent to Chain

Edit `.claude/chain-config.yaml`:

```yaml
flow:
  # Add new agent
  new-agent:
    routes:
      next-agent: "Success description"
      fallback: "Failure description"
    decide: |
      If SUCCESS → "next-agent"
      If FAILED → "fallback"
```

Then update the previous agent's routes to point to the new agent.

## Create Custom Workflow

1. Start with: `mcp__brainbrew__bump_template(template: "minimal")`
2. Create agents: Write `.claude/agents/*.md`
3. Create skills: Write `.claude/skills/*/SKILL.md`
4. Define flow: Edit `.claude/chain-config.yaml`

## After Setup

Tell user:
```
Workflow ready! You can:
- "Create an agent for X"
- "Create a skill for Y"
- "Tell implementer to Z" (Memory Bus)
- "Show the chain flow"
```
