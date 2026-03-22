---
name: skill-finder
description: Search and install skills from multiple sources (Vercel Skills, GitHub, Anthropic official). Use when user says "find skill", "search skill", "install skill", "skillhub", or when an agent is missing skills during improve-agent audit.
argument-hint: "[search query or skill name]"
---

# SkillHub

Search and install skills into `.claude/skills/` (project root).

## Workflow

1. **Search** — try sources in priority order
2. **Review** — present top results to user
3. **Install** — fetch SKILL.md → write to `.claude/skills/{name}/SKILL.md`

## Search Sources (priority order)

### 1. Vercel Skills CLI (free, unlimited, recommended)

```bash
npx skills search "SEARCH_TERM"
```

Install directly:

```bash
npx skills install SKILL_NAME --dir .claude/skills
```

### 2. GitHub Search (free, unlimited)

```bash
gh search code "SEARCH_TERM" --filename SKILL.md --language markdown -L 10
```

Fetch raw SKILL.md:

```bash
gh api repos/OWNER/REPO/contents/skills/SKILL_NAME/SKILL.md -q '.content' | base64 -d
```

### 3. Anthropic Official Skills

```bash
gh api repos/anthropics/skills/contents/skills -q '.[].name'
```

Fetch specific skill:

```bash
gh api repos/anthropics/skills/contents/skills/SKILL_NAME/SKILL.md -q '.content' | base64 -d
```

## Install

After user picks a skill:
1. Prefer `npx skills install SKILL_NAME --dir .claude/skills` if available
2. Otherwise: fetch SKILL.md + references/ → write to `.claude/skills/{name}/`

## Rules

- Install to `.claude/skills/` (project root), NOT `~/.claude/skills/`
- Always show skill name and description before installing
- Ask user before installing — never auto-install without confirmation
- Prefer Vercel Skills CLI first (best UX), then GitHub
