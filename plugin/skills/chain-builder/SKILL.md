---
name: chain-builder
description: >-
  Set up workflow templates and manage chain flows. Trigger when user says:
  "set up a workflow", "create a development workflow", "I need a CI/CD pipeline",
  "set up devops", "bump develop", "bump devops", "add agent to chain",
  "show chain flow", "edit chain config", "create custom workflow",
  "add a team node", "run agents in parallel", "create agent team",
  "validate chain", "check chain config", "verify chain".
---

# Chain Builder

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

Returns ✅ PASS or list of ❌/⚠ issues.

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

### Flow Node Types

There are two node types: **agent** (default) and **team**.

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

### Agent Node Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `routes` | Yes | Map of `agent-name: "description"`. Multiple routes allowed |
| `decide` | No | AI prompt sent to Haiku to pick route based on agent output |
| `reset_counters` | No | Reset loop counters when routing (for approval gates). Loop protection is off by default. |
| `next` | No | Legacy: simple next agent (use `routes` instead) |
| `on_fail` | No | Legacy: fallback on failure keywords |
| `on_issues` | No | Legacy: fallback on issue keywords |

### How Routing Works

1. Agent completes → PostToolUse hook fires
2. If `decide` prompt exists and output > 50 chars → Haiku analyzes output against routing rules
3. Haiku returns `{"route": "agent-name", "reason": "..."}`
4. If Haiku fails → fallback to keyword matching (pass/approved/success vs fail/error/issues)
5. If no match → default to first route
6. Route `"END"` stops the chain

## Add Agent Team Node

Agent teams run multiple agents **in parallel** at a chain step. Each teammate gets its own context and they can communicate with each other.

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

### Team Node Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `type` | Yes | Must be `team` |
| `teammates` | Yes | Array of teammate definitions |
| `routes` | Yes | Same as agent node — where to go after team completes |
| `decide` | No | AI routing rules applied to synthesized team output |

### Teammate Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `name` | Yes | Unique identifier for this teammate |
| `agent` | Yes | Agent type to spawn (must exist in `.claude/agents/`) |
| `prompt` | No | Specific instructions for this teammate's focus area |
| `model` | No | Override model (sonnet, opus, haiku) |

### How Teams Work

1. Previous agent completes → hook detects next node is `type: team`
2. Hook emits MANDATORY NEXT STEP instructing Claude to create an agent team
3. Claude spawns all teammates in parallel using TeamCreate
4. Each teammate works independently with its own context
5. After all teammates finish, results are synthesized
6. Hook routes to next agent based on `decide` rules

### When to Use Teams vs Sequential Agents

| Use Teams | Use Sequential |
|-----------|---------------|
| Independent tasks (review + security + tests) | Tasks that depend on each other |
| Different perspectives on same work | Each step builds on previous output |
| Speed matters — parallel is faster | Order matters — must be sequential |
| Teammates don't edit same files | Agents modify shared files |

### Team Examples

**Parallel code review (security + quality + performance):**
```yaml
  comprehensive-review:
    type: team
    teammates:
      - name: security
        agent: security-scan
        prompt: "Focus on vulnerabilities, injection risks, exposed secrets"
      - name: quality
        agent: code-reviewer
        prompt: "Focus on bugs, logic errors, naming, patterns"
      - name: performance
        agent: code-reviewer
        prompt: "Focus on performance bottlenecks, memory leaks, N+1 queries"
    routes:
      tester: "All clear"
      implementer: "Issues found"
```

**Parallel research:**
```yaml
  parallel-research:
    type: team
    teammates:
      - name: frontend-scout
        agent: scout
        prompt: "Explore frontend architecture, components, state management"
      - name: backend-scout
        agent: scout
        prompt: "Explore backend architecture, APIs, database schema"
      - name: test-scout
        agent: scout
        prompt: "Explore test coverage, testing patterns, CI setup"
    routes:
      planner: "Research complete, ready to plan"
```

## Create Custom Workflow

1. Start with: `mcp__brainbrew__template_bump(template: "minimal")`
2. Create agents: `.claude/agents/{name}.md`
3. Create skills: `.claude/skills/{name}/SKILL.md`
4. Edit active chain: `.claude/chains/{name}.yaml`
5. Switch chains: `mcp__brainbrew__chain_switch(chain: "name")`
6. Restart Claude Code session

### Hook System (3 Layers)

Hooks run in order through 3 layers:

| Layer | Source | When |
|-------|--------|------|
| 1. Built-in | Hardcoded in `runner.cjs` | Always (empty by default) |
| 2. User hooks | `.claude/hooks.yaml` | If file exists |
| 3. Chain hooks | `.claude/chains/{name}.yaml` → `hooks:` section | Only when chain is active |

**User hooks** — create `.claude/hooks.yaml` to add hooks at any lifecycle stage:

```yaml
# Safety guards
PreToolUse:
  - plugin:safety-guard.cjs
  - ./my-linter.js

# Session lifecycle
SessionStart:
  - plugin:session-start.cjs
  - ./setup-env.js
SessionEnd:
  - plugin:session-end.cjs

# Agent lifecycle
PostToolUse:
  - ./my-logger.js
SubagentStart:
  - ./inject-context.js
SubagentStop:
  - ./my-validator.js

# Other events
UserPromptSubmit:
  - ./my-prompt-filter.js
Stop:
  - ./cleanup.js
Notification:
  - ./my-notifier.js
```

Scripts go in `.claude/hooks/`. Each receives stdin JSON from Claude Code.

Return `{"decision": "block", "reason": "..."}` to block, or exit 0 to pass through.

**Available lifecycle events:** `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `Notification`

**Built-in scripts** (shipped with plugin, opt-in via `plugin:` prefix):

| Script | Purpose |
|--------|---------|
| `plugin:safety-guard.cjs` | Block dangerous commands (rm -rf, git push --force, DROP TABLE, etc.) |
| `plugin:session-start.cjs` | Session initialization and context setup |
| `plugin:session-end.cjs` | Session cleanup |

**Chain hooks** — defined inside chain files (`.claude/chains/{name}.yaml`), only run when that chain is active:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs
```

### Script Path Resolution

| Prefix | Resolves to |
|--------|-------------|
| `plugin:` | Plugin's built-in scripts |
| `./` | `.claude/hooks/` in project |
| `/absolute` | Absolute path |

## Post-Bump Tuning

After `template_bump`, review and tune these files:

### 1. Chain Config (`.claude/chains/{name}.yaml`)
- Adjust routing rules in `decide` prompts
- Add/remove agents from flow
- Configure `reset_counters` for approval gates

### 2. Agent Definitions (`.claude/agents/*.md`)
- Update `description` for your project context
- Adjust `tools` list (add/remove as needed)
- Add project-specific skills in `skills:` frontmatter

### 3. Skills (`.claude/skills/*/SKILL.md`)
- Update skill instructions for your stack/conventions
- Add project-specific rules and patterns
- Reference common patterns from `.claude/skills/common/`

### 4. Validate
```
mcp__brainbrew__chain_validate()
```

## Install Plugins

Plugins extend Claude Code sessions with background tools (notifications, cost tracking, sandboxing, etc.).

Browse available plugins:
```
mcp__brainbrew__plugin_list()
```

Search by keyword:
```
mcp__brainbrew__plugin_list(query: "docker")
mcp__brainbrew__plugin_list(query: "cost")
```

Each result includes the plugin `path`. Read its `CLAUDE.md` for install instructions — the AI handles the rest.

To customize a plugin, copy it into the project:
```bash
cp -r <plugin-path> .claude/plugins/<name>/
```

## After Setup

Tell user:
```
Workflow ready! You can:
- "Create an agent for X"
- "Create a skill for Y"
- "Add a team node for parallel review"
- "Tell implementer to Z" (Memory Bus)
- "Show the chain flow"
- "List available plugins" (plugin_list)
```
