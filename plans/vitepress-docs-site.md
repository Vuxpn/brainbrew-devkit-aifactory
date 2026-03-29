# VitePress Documentation Site for brainbrew-devkit

## Summary

Create a VitePress-powered documentation site that transforms existing markdown files (skills, agents, templates) into a navigable static documentation site with auto-generated references.

## Goals

1. VitePress setup with minimal config
2. Reuse existing markdown (SKILL.md files, agent docs, README)
3. Auto-generate skill/agent reference pages from frontmatter
4. Static output to `docs/.vitepress/dist/`
5. GitHub Pages deployment workflow

---

## Phase 1: VitePress Setup

### 1.1 Install VitePress

**File: `package.json`** — add devDependency and scripts

```json
{
  "devDependencies": {
    "vitepress": "^1.6.0"
  },
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

### 1.2 Create VitePress Config

**File: `docs/.vitepress/config.ts`**

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Brainbrew Devkit',
  description: 'Agent pipelines that fix themselves',
  base: '/brainbrew-devkit/',

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Skills', link: '/skills/' },
      { text: 'Agents', link: '/agents/' },
      { text: 'Templates', link: '/templates/' },
      { text: 'API', link: '/api/' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Chain Workflow', link: '/guide/chain-workflow' },
            { text: 'Memory Bus', link: '/guide/memory-bus' },
            { text: 'Agent Teams', link: '/guide/agent-teams' }
          ]
        },
        {
          text: 'Customization',
          items: [
            { text: 'Custom Agents', link: '/guide/custom-agents' },
            { text: 'Custom Skills', link: '/guide/custom-skills' },
            { text: 'Custom Hooks', link: '/guide/custom-hooks' }
          ]
        }
      ],
      '/skills/': [
        {
          text: 'Skills Reference',
          items: [
            { text: 'Overview', link: '/skills/' },
            { text: 'chain-builder', link: '/skills/chain-builder' },
            { text: 'memory', link: '/skills/memory' },
            { text: 'skill-creator', link: '/skills/skill-creator' },
            { text: 'skill-improver', link: '/skills/skill-improver' },
            { text: 'skill-finder', link: '/skills/skill-finder' },
            { text: 'agent-improver', link: '/skills/agent-improver' }
          ]
        }
      ],
      '/agents/': [
        {
          text: 'Agents Reference',
          items: [
            { text: 'Overview', link: '/agents/' }
          ]
        }
      ],
      '/templates/': [
        {
          text: 'Templates',
          items: [
            { text: 'Overview', link: '/templates/' },
            { text: 'develop', link: '/templates/develop' },
            { text: 'devops', link: '/templates/devops' },
            { text: 'marketing', link: '/templates/marketing' },
            { text: 'research', link: '/templates/research' },
            { text: 'docs', link: '/templates/docs' },
            { text: 'support', link: '/templates/support' },
            { text: 'data', link: '/templates/data' },
            { text: 'moderation', link: '/templates/moderation' },
            { text: 'review', link: '/templates/review' },
            { text: 'minimal', link: '/templates/minimal' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'MCP Tools', link: '/api/mcp-tools' },
            { text: 'Hooks', link: '/api/hooks' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/brainbrewlabs/brainbrew-devkit' }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2025 Brainbrew Labs'
    }
  }
})
```

### 1.3 Create Theme Extension (Optional)

**File: `docs/.vitepress/theme/index.ts`**

```ts
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default DefaultTheme
```

**File: `docs/.vitepress/theme/custom.css`**

```css
:root {
  --vp-c-brand-1: #6366f1;
  --vp-c-brand-2: #8b5cf6;
  --vp-c-brand-3: #a78bfa;
}
```

---

## Phase 2: Guide Pages

### 2.1 Landing Page

**File: `docs/index.md`**

```md
---
layout: home
hero:
  name: Brainbrew Devkit
  text: Agent pipelines that fix themselves
  tagline: Self-correcting chains with automatic routing, retry, and coordination
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/brainbrewlabs/brainbrew-devkit
features:
  - title: Self-Correcting Pipelines
    details: Failures auto-route to fixers, then re-enter the chain
  - title: AI-Powered Routing
    details: Haiku analyzes output and picks the next step
  - title: Agent Teams
    details: Parallel execution with coordinated synthesis
  - title: Memory Bus
    details: Inter-agent state sharing across pipeline runs
---
```

### 2.2 Guide Pages Structure

Create these files by transforming README.md sections:

| File | Source | Notes |
|------|--------|-------|
| `docs/guide/index.md` | README intro | Overview page |
| `docs/guide/installation.md` | README Quick Start | Install commands |
| `docs/guide/quick-start.md` | README Quick Start | First workflow |
| `docs/guide/getting-started.md` | New | Combined intro |
| `docs/guide/chain-workflow.md` | README Flow Config | Chain concepts |
| `docs/guide/memory-bus.md` | `plugin/skills/memory/SKILL.md` | Transform |
| `docs/guide/agent-teams.md` | README Agent Teams | Team concepts |
| `docs/guide/custom-agents.md` | README Customization | Agent creation |
| `docs/guide/custom-skills.md` | `plugin/skills/skill-creator/SKILL.md` | Transform |
| `docs/guide/custom-hooks.md` | README Custom Hooks | Hook scripts |

---

## Phase 3: Skills Reference (Auto-Generated)

### 3.1 Skills Overview Page

**File: `docs/skills/index.md`**

```md
# Skills Reference

Skills are Claude Code plugins that provide specialized capabilities.

## Plugin Skills

These skills ship with brainbrew-devkit:

| Skill | Description |
|-------|-------------|
| [chain-builder](/skills/chain-builder) | Set up workflow templates and manage chain flows |
| [memory](/skills/memory) | Inter-agent communication via Memory Bus |
| [skill-creator](/skills/skill-creator) | Create and manage skills |
| [skill-improver](/skills/skill-improver) | Iteratively review and fix skill quality |
| [skill-finder](/skills/skill-finder) | Search and install skills from multiple sources |
| [agent-improver](/skills/agent-improver) | Create and improve agents |
```

### 3.2 Individual Skill Pages

Transform `plugin/skills/*/SKILL.md` files:

1. Copy SKILL.md content to `docs/skills/{name}.md`
2. Strip frontmatter (VitePress handles differently)
3. Add navigation links

**File: `docs/skills/chain-builder.md`** — copy from `plugin/skills/chain-builder/SKILL.md`

**File: `docs/skills/memory.md`** — copy from `plugin/skills/memory/SKILL.md`

*(And so on for each skill)*

### 3.3 Build Script for Auto-Generation (Optional Enhancement)

**File: `scripts/generate-docs.ts`**

```ts
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const PLUGIN_SKILLS_DIR = './plugin/skills'
const DOCS_SKILLS_DIR = './docs/skills'

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { frontmatter: {}, body: content }

  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)/)
    if (kv) frontmatter[kv[1]] = kv[2]
  }
  return { frontmatter, body: content.slice(match[0].length).trim() }
}

function generateSkillDocs() {
  if (!existsSync(DOCS_SKILLS_DIR)) mkdirSync(DOCS_SKILLS_DIR, { recursive: true })

  const skills = readdirSync(PLUGIN_SKILLS_DIR)

  for (const skill of skills) {
    const skillPath = join(PLUGIN_SKILLS_DIR, skill, 'SKILL.md')
    if (!existsSync(skillPath)) continue

    const content = readFileSync(skillPath, 'utf-8')
    const { frontmatter, body } = parseFrontmatter(content)

    const docContent = `# ${frontmatter.name || skill}\n\n${body}`
    writeFileSync(join(DOCS_SKILLS_DIR, `${skill}.md`), docContent)
  }
}

generateSkillDocs()
```

---

## Phase 4: Agents Reference

### 4.1 Agents Overview Page

**File: `docs/agents/index.md`**

```md
# Agents Reference

Agents are specialized Claude subagents with focused capabilities.

## Management Agents

| Agent | Description |
|-------|-------------|
| skill-reviewer | Reviews and grades skill quality |

## Template Agents

Each template provides specialized agents. Run `template_bump` to install them.

See [Templates](/templates/) for agent lists per workflow.
```

### 4.2 Individual Agent Pages (Optional)

If needed, create pages for key agents like `skill-reviewer.md`.

---

## Phase 5: Templates Reference

### 5.1 Templates Overview Page

**File: `docs/templates/index.md`**

```md
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

\`\`\`
mcp__brainbrew__template_bump(template: "develop")
\`\`\`
```

### 5.2 Individual Template Pages

**File: `docs/templates/develop.md`**

```md
# Develop Template

Full development workflow with automatic code review, testing, and git management.

## Chain Flow

\`\`\`
planner → plan-reviewer → implementer → parallel-review (team) → tester → git-manager
              ↓ ISSUES        ↓ ISSUES        ↓ ISSUES         ↓ FAIL
            planner        implementer      implementer     debugger → implementer
\`\`\`

## Agents Included

- planner
- plan-reviewer
- implementer
- code-reviewer
- security-scan
- tester
- debugger
- git-manager

## Flow Config

\`\`\`yaml
# (include develop.yaml flow section)
\`\`\`
```

*(Create similar pages for each template)*

---

## Phase 6: API Reference

### 6.1 MCP Tools Page

**File: `docs/api/mcp-tools.md`**

```md
# MCP Tools Reference

All brainbrew functionality exposed via MCP tools.

## Template Tools

### template_bump

Set up a workflow template in the current project.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| template | string | Yes | Template name: develop, devops, marketing, research, docs, support, data, moderation, review, minimal |

**Example:**
\`\`\`
mcp__brainbrew__template_bump(template: "develop")
\`\`\`

### template_list

List all available workflow templates.

## Chain Tools

### chain_validate

Validate the active chain config.

**Checks:**
- All agents in flow exist
- Team nodes have valid teammates
- Routes point to valid targets
- No dead-end nodes

### chain_list

List all available chains and show which is active.

### chain_switch

Switch the active chain.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| chain | string | Yes | Chain name to activate |

## Memory Bus Tools

### memory_add

Send a message to agents via Memory Bus.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| content | string | Yes | - | Message content |
| target | string | No | global | Who receives: global, next, agent:NAME, chain:NAME |
| persistence | string | No | session | session, once, permanent |
| priority | string | No | normal | low, normal, high, urgent |

### memory_list

List messages in the Memory Bus.

### memory_clear

Clear messages from Memory Bus.
```

### 6.2 Hooks Page

**File: `docs/api/hooks.md`**

```md
# Hooks Reference

Built-in hooks that power the chain engine.

## PostToolUse: post-agent.cjs

Fires after agent completes. Reads `decide:` prompt, calls Haiku, picks next agent.

**Behavior:**
1. Agent completes
2. Load chain config from `.claude/chains/{active}.yaml`
3. If `decide` prompt exists → call Haiku with routing rules
4. Haiku returns `{"route": "agent-name", "reason": "..."}`
5. Emit MANDATORY NEXT STEP instruction

## SubagentStart: subagent-start.cjs

Injects context when agent spawns.

**Injected Context:**
- Chain state
- Memory Bus messages for this agent
- Previous agent output summary

## SubagentStop: subagent-stop.cjs

Verifies output quality, blocks incomplete work with retry feedback.

**Quality Checks:**
- Output not empty
- No critical errors
- Task appears complete

## Custom Hooks

Place scripts in `.claude/hooks/` and register in chain config:

\`\`\`yaml
hooks:
  PostToolUse:
    - plugin:post-agent.cjs
    - ./my-validator.js
\`\`\`
```

---

## Phase 7: GitHub Pages Deployment

### 7.1 GitHub Actions Workflow

**File: `.github/workflows/docs.yml`**

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'plugin/skills/*/SKILL.md'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run docs:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### 7.2 Enable GitHub Pages

In repository settings:
1. Go to Settings > Pages
2. Source: GitHub Actions

---

## File Structure Summary

```
docs/
├── .vitepress/
│   ├── config.ts              # VitePress config
│   └── theme/
│       ├── index.ts           # Theme extension
│       └── custom.css         # Custom styles
├── index.md                   # Landing page
├── guide/
│   ├── index.md               # Guide overview
│   ├── installation.md
│   ├── quick-start.md
│   ├── getting-started.md
│   ├── chain-workflow.md
│   ├── memory-bus.md
│   ├── agent-teams.md
│   ├── custom-agents.md
│   ├── custom-skills.md
│   └── custom-hooks.md
├── skills/
│   ├── index.md               # Skills overview
│   ├── chain-builder.md       # From plugin/skills/chain-builder/SKILL.md
│   ├── memory.md              # From plugin/skills/memory/SKILL.md
│   ├── skill-creator.md
│   ├── skill-improver.md
│   ├── skill-finder.md
│   └── agent-improver.md
├── agents/
│   └── index.md               # Agents overview
├── templates/
│   ├── index.md               # Templates overview
│   ├── develop.md
│   ├── devops.md
│   ├── marketing.md
│   ├── research.md
│   ├── docs.md
│   ├── support.md
│   ├── data.md
│   ├── moderation.md
│   ├── review.md
│   └── minimal.md
├── api/
│   ├── mcp-tools.md
│   └── hooks.md
└── public/
    └── logo.svg               # Optional logo

.github/
└── workflows/
    └── docs.yml               # GitHub Pages deployment
```

---

## Files to Modify

| File | Action |
|------|--------|
| `package.json` | Add vitepress devDependency, add scripts |

## Files to Create

| File | Priority |
|------|----------|
| `docs/.vitepress/config.ts` | P0 |
| `docs/index.md` | P0 |
| `docs/guide/getting-started.md` | P0 |
| `docs/guide/installation.md` | P0 |
| `docs/guide/quick-start.md` | P0 |
| `docs/guide/chain-workflow.md` | P1 |
| `docs/guide/memory-bus.md` | P1 |
| `docs/guide/custom-skills.md` | P1 |
| `docs/skills/index.md` | P0 |
| `docs/skills/chain-builder.md` | P0 |
| `docs/skills/memory.md` | P0 |
| `docs/templates/index.md` | P0 |
| `docs/templates/develop.md` | P1 |
| `docs/api/mcp-tools.md` | P0 |
| `docs/api/hooks.md` | P1 |
| `.github/workflows/docs.yml` | P1 |

---

## Implementation Order

1. **Phase 1** (30 min): VitePress setup, config, package.json scripts
2. **Phase 2** (1 hr): Guide pages — transform README sections
3. **Phase 3** (45 min): Skills reference — copy/transform SKILL.md files
4. **Phase 4** (15 min): Agents overview
5. **Phase 5** (45 min): Templates reference
6. **Phase 6** (30 min): API reference (MCP tools, hooks)
7. **Phase 7** (15 min): GitHub Actions workflow

**Total estimate:** ~4 hours

---

## Unresolved Questions

1. Should we auto-generate skill pages from `plugin/skills/*/SKILL.md` on build, or manually copy? Auto-gen adds complexity but ensures sync.
2. Logo/branding assets needed? Currently placeholder.
3. Should template agent lists be auto-generated from `plugin/config/templates/*/agents/*.md`?
