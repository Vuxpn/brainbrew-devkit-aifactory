# brainbrew-devkit

BrainBrew development toolkit — a Claude Code plugin providing agent chains, skills, and automated dev workflows.

## Features

- **10 workflow templates** with pre-configured agent chains
- **AI-powered routing** — Haiku analyzes agent output to pick the next step
- **Flexible flows** — Multiple routes per agent, conditional branching
- **Agent teams** — Parallel agent execution with team coordination
- **60+ agents** and **60+ skills** across all templates

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
"Tell implementer to fix the bug"      → memory_add(target: agent:implementer)
"What agents do I have?"               → list_agents()
```

## MCP Tools

All functionality exposed via MCP - no CLI install needed:

| Tool | Description |
|------|-------------|
| `template_bump` | Set up workflow template |
| `template_list` | Show available templates |
| `chain_validate` | Validate chain config (agents exist, team nodes valid, routes correct) |
| `memory_add` | Send message to agents via Memory Bus |
| `memory_list` | List messages in Memory Bus |
| `memory_clear` | Clear messages from Memory Bus |

Agents, skills, and chain config are just files — Claude reads/writes them directly.

## Workflow Templates

| Template | Agents | Chain |
|----------|--------|-------|
| **develop** | 22 | planner → plan-reviewer → implementer → **parallel-review** (team) → tester → git-manager |
| **devops** | 10 | code-scanner → security-auditor → test-runner → deployer → monitor |
| **marketing** | 6 | researcher → content-writer → editor → seo-optimizer → publisher → analyzer |
| **research** | 5 | topic-researcher → source-gatherer → analyzer → synthesizer → report-writer |
| **docs** | 5 | code-scanner → doc-generator → doc-reviewer → formatter → publisher |
| **support** | 5 | ticket-classifier → router → knowledge-searcher → response-drafter → reviewer |
| **data** | 5 | data-collector → cleaner → analyzer → visualizer → reporter |
| **moderation** | 5 | content-scanner → classifier → flagger → reviewer → actioner |
| **review** | 1 | code-reviewer → END |
| **minimal** | 0 | hooks only (add your own) |

> **Note:** After bumping a template (`template_bump`), restart your Claude Code session for the new hooks, agents, and chain config to take effect.

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

### Agent Teams

Use `type: team` to run multiple agents in parallel at a chain step:

```yaml
flow:
  parallel-review:
    type: team
    teammates:
      - name: code-quality
        agent: code-reviewer
        prompt: "Review code for bugs and quality"
      - name: security-check
        agent: security-scan
        prompt: "Scan for security vulnerabilities"
    routes:
      tester: "All reviews passed"
      implementer: "Issues found, needs fixes"
    decide: |
      If ALL reviews PASSED → "tester"
      If ANY review found issues → "implementer"
```

Teammates run as a Claude Code [agent team](https://code.claude.com/docs/en/agent-teams) — each gets its own context, they can message each other, and results are synthesized before routing to the next step. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.

## Customization

### Create Custom Agent

Just ask:
```
"Create an agent for API testing"
"I need an agent that reviews SQL queries"
"Make me a documentation agent"
```

Or manually create `.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: >-
  What this agent does and when Claude should delegate to it.
tools: Bash, Read, Edit
model: sonnet
---

When invoked:
1. Step 1
2. Step 2

Output: structured results.
```

### Create Custom Skill

Just ask:
```
"Create a skill for deploying to AWS"
"I need a skill for running database migrations"
"Make a skill that formats my code"
```

Or manually create `.claude/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: >-
  When to trigger this skill. Triggers on 'X', 'Y'.
allowed-tools: Read, Grep, Bash
---

## When to Use
- Scenario 1

## When NOT to Use
- Anti-pattern

## Instructions
1. Step 1
2. Step 2
```

### Create Custom Chain

Just ask:
```
"Create a workflow: researcher → writer → editor → publisher"
"I need a chain for: scan code → review → test → deploy"
"Build me a support workflow with ticket routing"
```

Or edit `.claude/chain-config.yaml`:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
  SubagentStart:
    - plugin:subagent-start.cjs
  SubagentStop:
    - plugin:subagent-stop.cjs

flow:
  # Your custom chain
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

### Custom Hook Scripts

You can inject your own hook scripts alongside the 3 built-in ones (`post-agent`, `subagent-start`, `subagent-stop`). Place scripts in `.claude/hooks/` and register them in `chain-config.yaml`:

```yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs        # built-in: chain routing
    - ./my-post-validator.js       # your custom script
  SubagentStart:
    - plugin:subagent-start.cjs    # built-in: context injection
    - ./inject-env-context.js      # your custom script
  SubagentStop:
    - plugin:subagent-stop.cjs     # built-in: output verification
  SessionEnd:
    - ./cleanup.js                 # your custom cleanup
```

**Script path resolution:**

| Prefix | Resolves to | Example |
|--------|-------------|---------|
| `plugin:` | Plugin's built-in scripts | `plugin:post-agent.cjs` |
| `./` | `{cwd}/.claude/hooks/` | `./my-hook.js` |
| `/absolute` | Absolute path | `/usr/local/hooks/lint.js` |

**Script contract:**

Your script receives the hook event payload via **stdin** (JSON) and communicates back via **stdout** + **exit code**:

| Exit code | stdout | Effect |
|-----------|--------|--------|
| `0` | _(empty)_ | No-op |
| `0` | `{"decision": "block", "reason": "..."}` | Block the tool use |
| `2` | JSON with `hookSpecificOutput` | Inject context into Claude's conversation |
| `0` | Any other text | Pass-through output |

Example — a custom script that injects context:

```js
// .claude/hooks/inject-env-context.js
const stdin = require('fs').readFileSync(0, 'utf-8');
const payload = JSON.parse(stdin);

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SubagentStart',
    additionalContext: `<system-reminder>Environment: ${process.env.NODE_ENV}</system-reminder>`,
  },
}));
```

Example — a custom script that blocks dangerous commands:

```js
// .claude/hooks/block-prod-deploy.js
const stdin = require('fs').readFileSync(0, 'utf-8');
const payload = JSON.parse(stdin);
const cmd = payload.tool_input?.command || '';

if (cmd.includes('deploy') && cmd.includes('production')) {
  console.log(JSON.stringify({
    decision: 'block',
    reason: 'Production deploys require manual approval',
  }));
}
```

### Mix & Match Templates

```bash
# Start with one template
/chain-builder bump develop

# Copy agents from another template manually
cp ~/.claude/plugins/cache/.../devops/agents/deployer.md .claude/agents/

# Add to your flow in chain-config.yaml
```

## Directory Structure

```
brainbrew-devkit/
  src/              # TypeScript source
  dist/             # Compiled output
  plugin/           # Distributable Claude Code plugin
    scripts/        # Chain engine (runner, hooks)
    hooks/          # Hook declarations
    agents/         # Management agents
    skills/         # Management skills (chain-builder, skill-creator, etc.)
    config/
      templates/    # Workflow templates
        develop/    # Full dev chain
        devops/     # CI/CD pipeline
        marketing/  # Content marketing
        ...
```

## Development

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run dev        # Watch mode
```

## Memory Bus - Inter-Agent Communication

Agents can communicate via the Memory Bus:

```bash
# Tell specific agent
"Tell the implementer to fix the auth bug"

# Next agent (queue)
"Next agent should check security"

# Permanent learning
"Remember to always use TypeScript"

# Chain handoff
"After this chain, deploy to staging"
```

| Target | Who receives |
|--------|--------------|
| `global` | All agents |
| `next` | Next agent only (consumed) |
| `agent:NAME` | Specific agent type |
| `chain:NAME` | All agents in chain |

| Persistence | Behavior | Auto-cleanup |
|-------------|----------|--------------|
| `session` | **Default** - temporary | ✅ On exit |
| `once` | Queue - consumed after read | ✅ After delivery |
| `permanent` | Forever (rules, knowledge) | ❌ Never |

## Architecture

Hook-driven chain engine with a single **runner** that dispatches to script hooks:

**Built-in hooks (3 + 1):**

1. **post-agent.cjs** — Fires after agent completes; reads `decide:` prompt, calls Haiku, picks next agent
2. **subagent-start.cjs** — Injects context (chain state, Memory Bus messages) when agent spawns
3. **subagent-stop.cjs** — Verifies output quality, blocks incomplete work with retry feedback
4. **session-end.cjs** — Cleans up Memory Bus session data (runs automatically, no config needed)

**Runner flow:**

```
Claude Code event → hooks.json → runner.cjs → loads chain-config.yaml → runs scripts sequentially
                                                 ├─ built-in plugin scripts
                                                 └─ user custom scripts (.claude/hooks/)
```

Flow config and custom hooks are read from `{cwd}/.claude/chain-config.yaml`.
