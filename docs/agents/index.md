# Agents Reference

Agents are specialized Claude subagents with focused capabilities.

## Management Agents

| Agent | Description |
|-------|-------------|
| skill-reviewer | Reviews and grades skill quality |

## Template Agents

Each template provides specialized agents. Run `template_bump` to install them.

### Develop Template (22 agents)

- planner
- plan-reviewer
- implementer
- code-reviewer
- security-scan
- tester
- debugger
- git-manager
- And more...

### DevOps Template (10 agents)

- code-scanner
- security-auditor
- test-runner
- deployer
- monitor

### Marketing Template (6 agents)

- researcher
- content-writer
- editor
- seo-optimizer
- publisher
- analyzer

See [Templates](/templates/) for complete agent lists per workflow.

## Creating Custom Agents

See the [Custom Agents](/guide/custom-agents) guide for details on creating your own agents.

## Agent Location

Agents are stored as markdown files:

| Location | Scope |
|----------|-------|
| `.claude/agents/` | Project-specific |
| `~/.claude/agents/` | User-wide (all projects) |
| Plugin `agents/` | Plugin-provided |
