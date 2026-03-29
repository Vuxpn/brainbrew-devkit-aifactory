# Workflow Templates

Pre-built agent chains for common workflows.

| Template | Agents | Chain |
|----------|--------|-------|
| [develop](/templates/develop) | 22 | planner → plan-reviewer → implementer → parallel-review → tester → git-manager |
| [devops](/templates/devops) | 10 | code-scanner → security-auditor → test-runner → deployer → monitor |
| [marketing](/templates/marketing) | 6 | researcher → content-writer → editor → seo-optimizer → publisher |
| [research](/templates/research) | 5 | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| [docs](/templates/docs) | 5 | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| [support](/templates/support) | 5 | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| [data](/templates/data) | 5 | data-collector → cleaner → analyzer → visualizer → reporter |
| [moderation](/templates/moderation) | 5 | content-scanner → classifier → flagger → reviewer → actioner |
| [review](/templates/review) | 1 | code-reviewer → END |
| [minimal](/templates/minimal) | 0 | hooks only |

## Usage

Set up a template using natural language:

```
"Set up a development workflow"
"I need a CI/CD pipeline"
```

Or use the MCP tool directly:

```
mcp__brainbrew__template_bump(template: "develop")
```

## After Bumping

After bumping a template, **restart your Claude Code session** for the new hooks, agents, and chain config to take effect.

## Mix and Match

Start with one template and add agents from another:

```bash
# Start with develop template
mcp__brainbrew__template_bump(template: "develop")

# Copy agents from devops template manually
# Then add to your chain config
```
