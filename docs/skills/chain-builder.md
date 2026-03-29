# chain-builder

Set up workflow templates and manage chain flows.

## Triggers

- "set up a workflow"
- "create a development workflow"
- "I need a CI/CD pipeline"
- "set up devops"
- "bump develop"
- "add agent to chain"
- "show chain flow"
- "validate chain"

## Set Up a Workflow Template

**Use MCP tool:**

```
mcp__brainbrew__template_bump(template: "develop")
```

### Templates

| Template | Chain |
|----------|-------|
| `develop` | planner → plan-reviewer → implementer → **parallel-review** (team) → tester → git-manager |
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

List chains and show the active one:

```
mcp__brainbrew__chain_list()
```

View active chain config:

```bash
cat .claude/chains/$(grep 'active:' .claude/chain-config.yaml | cut -d' ' -f2).yaml
```

## Validate Chain Config

```
mcp__brainbrew__chain_validate()
```

Checks:
- All agents in flow have matching `.claude/agents/{name}.md` files
- Team nodes have valid teammates with `name` and `agent` fields
- Teammate agents exist in `.claude/agents/`
- All routes point to nodes defined in the flow
- No dead-end nodes (nodes without routes)

Returns PASS or list of issues.

## Chain Config Structure

The project uses a pointer file + chain directory:

```
.claude/chain-config.yaml       # pointer to active chain
.claude/chains/
  develop.yaml                  # chain definition (hooks + flow)
  discovery.yaml                # another chain
```

Pointer file (`.claude/chain-config.yaml`):

```yaml
active: develop
chains_dir: .claude/chains/
```

Each chain file in `.claude/chains/` has the same format:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs

flow:
  agent-name:
    routes:
      next-agent: "When to go here"
    decide: |
      AI routing rules
```

## List Chains

```
mcp__brainbrew__chain_list()
```

Shows all chains and which is active.

## Switch Active Chain

```
mcp__brainbrew__chain_switch(chain: "discovery")
```

Takes effect immediately for subsequent agent runs.

## Add Agent Node

Edit the active chain file in `.claude/chains/`:

```yaml
flow:
  new-agent:
    routes:
      next-agent: "Success — move forward"
      fallback: "Failed — try alternative"
    decide: |
      If SUCCESS → "next-agent"
      If FAILED → "fallback"
```

Then update the previous agent's routes to point to the new agent.

## Add Agent Team Node

Agent teams run multiple agents **in parallel** at a chain step:

```yaml
flow:
  parallel-review:
    type: team
    teammates:
      - name: code-quality
        agent: code-reviewer
        prompt: "Review code for bugs, quality, and adherence to plan"
      - name: security-check
        agent: security-scan
        prompt: "Scan for security vulnerabilities and exposed secrets"
    routes:
      tester: "All reviews passed"
      implementer: "Issues found, needs fixes"
    decide: |
      If ALL reviews PASSED with no issues → "tester"
      If ANY review found bugs, issues, vulnerabilities → "implementer"
```

## Create Custom Workflow

1. Start with: `mcp__brainbrew__template_bump(template: "minimal")`
2. Create agents: `.claude/agents/{name}.md`
3. Create skills: `.claude/skills/{name}/SKILL.md`
4. Edit active chain: `.claude/chains/{name}.yaml`
5. Switch chains: `mcp__brainbrew__chain_switch(chain: "name")`
6. Restart Claude Code session
