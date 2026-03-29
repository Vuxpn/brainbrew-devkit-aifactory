# Chain Workflow

Chains define the flow of agents through your pipeline, including routing rules and error handling.

## Chain Config Structure

The project uses a pointer file plus a chain directory:

```
.claude/chain-config.yaml       # pointer to active chain
.claude/chains/
  develop.yaml                  # chain definition (hooks + flow)
  discovery.yaml                # another chain
```

### Pointer File

`.claude/chain-config.yaml`:

```yaml
active: develop
chains_dir: .claude/chains/
```

### Chain File

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

## Flow Config

Each template includes a `flow:` section with AI-powered routing:

```yaml
flow:
  code-reviewer:
    routes:
      tester: "Code approved, ready for testing"
      implementer: "Code has issues, needs fixes"
    decide: |
      If code is APPROVED → "tester"
      If ANY bugs, issues → "implementer"
```

- **routes:** Maps agent names to descriptions (multiple routes allowed)
- **decide:** AI prompt sent to Haiku to pick which route based on output

## How Routing Works

1. Agent completes → PostToolUse hook fires
2. If `decide` prompt exists and output > 50 chars → Haiku analyzes output against routing rules
3. Haiku returns `{"route": "agent-name", "reason": "..."}`
4. If Haiku fails → fallback to keyword matching (pass/approved/success vs fail/error/issues)
5. If no match → default to first route
6. Route `"END"` stops the chain

## Agent Node Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `routes` | Yes | Map of `agent-name: "description"`. Multiple routes allowed |
| `decide` | No | AI prompt sent to Haiku to pick route based on agent output |
| `reset_counters` | No | Reset loop counters when routing (for approval gates). Loop protection is off by default. |
| `next` | No | Legacy: simple next agent (use `routes` instead) |
| `on_fail` | No | Legacy: fallback on failure keywords |
| `on_issues` | No | Legacy: fallback on issue keywords |

## Managing Chains

### List Chains

```
mcp__brainbrew__chain_list()
```

Shows all chains and which is active.

### Switch Active Chain

```
mcp__brainbrew__chain_switch(chain: "discovery")
```

Takes effect immediately for subsequent agent runs.

### Validate Chain Config

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

## Creating Custom Chains

1. Start with: `mcp__brainbrew__template_bump(template: "minimal")`
2. Create agents: `.claude/agents/{name}.md`
3. Create skills: `.claude/skills/{name}/SKILL.md`
4. Edit active chain: `.claude/chains/{name}.yaml`
5. Switch chains: `mcp__brainbrew__chain_switch(chain: "name")`
6. Restart Claude Code session

## Example Chain

```yaml
flow:
  researcher:
    routes:
      writer: "Research complete"

  writer:
    routes:
      reviewer: "Draft complete"
      researcher: "Need more research"
    decide: |
      If draft COMPLETE → "reviewer"
      If needs MORE INFO → "researcher"

  reviewer:
    routes:
      publisher: "Approved"
      writer: "Needs revision"
    decide: |
      If APPROVED → "publisher"
      If REVISION needed → "writer"

  publisher:
    routes:
      END: "Published"
```
