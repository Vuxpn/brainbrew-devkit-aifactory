# BrainBrew DevKit Plugin

AI-powered development toolkit for Claude Code — customizable agent chains, modular skills, and automated workflow orchestration.

## Installation

In a Claude Code session, run:

```
/plugin marketplace add brainbrewlabs/brainbrew-devkit
/plugin install brainbrew-devkit
```

Then restart Claude Code.

## Quick Start

Just tell Claude what you want in natural language:

```
"Set up a development workflow"        → bump_template(develop)
"I need a CI/CD pipeline"              → bump_template(devops)
"Create an agent for API testing"      → create_agent(...)
"Build me a deployment skill"          → create_skill(...)
"Tell implementer to fix the bug"      → memory_add(...)
"What agents do I have?"               → list_agents()
```

## MCP Tools

All functionality exposed via MCP - no CLI needed:

| Tool | Description |
|------|-------------|
| `bump_template` | Set up workflow template |
| `list_templates` | Show available templates |
| `create_agent` | Create new agent |
| `list_agents` | List project agents |
| `create_skill` | Create new skill |
| `list_skills` | List project skills |
| `memory_add` | Send message to agents |
| `memory_list` | List messages |
| `memory_clear` | Clear messages |
| `get_chain_flow` | Show chain config |
| `add_agent_to_flow` | Add agent to chain |

## Workflow Templates

| Template | Agents | Chain |
|----------|--------|-------|
| **develop** | 22 | planner → plan-reviewer → implementer → code-reviewer → tester → git-manager |
| **devops** | 10 | code-scanner → security-auditor → test-runner → deployer → monitor |
| **marketing** | 6 | researcher → content-writer → editor → seo-optimizer → publisher |
| **research** | 5 | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| **docs** | 5 | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| **support** | 5 | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| **data** | 5 | data-collector → cleaner → analyzer → visualizer → reporter |
| **moderation** | 5 | content-scanner → classifier → flagger → reviewer → actioner |
| **review** | 1 | code-reviewer → END |
| **minimal** | 0 | hooks only (add your own) |

## Memory Bus - Inter-Agent Communication

Send messages between agents:

```
"Tell implementer to fix auth"     → memory_add(target: "agent:implementer")
"Next agent should check security" → memory_add(target: "next")
"Remember to use TypeScript"       → memory_add(persistence: "permanent")
```

| Persistence | Behavior |
|-------------|----------|
| `session` | Default - cleared on exit |
| `once` | Consumed after delivery |
| `permanent` | Forever (rules, knowledge) |

## AI-Powered Routing

Each template includes intelligent routing:

```yaml
flow:
  code-reviewer:
    routes:
      tester: "Code approved"
      implementer: "Code has issues"
    decide: |
      If APPROVED → "tester"
      If issues → "implementer"
```

## Customization

| What you want | Just say |
|---------------|----------|
| Dev workflow | "Set up a development workflow" |
| CI/CD pipeline | "I need a CI/CD pipeline" |
| Custom agent | "Create an agent for X" |
| Custom skill | "Build me a skill for Y" |
| Send to agent | "Tell implementer to fix X" |
| List items | "What agents/skills do I have?" |
