---
name: plan
description: Create technical implementation plans with research and codebase analysis. Use when user says "plan this", "design the approach", "how should we implement", "architect this", "break down this feature", or needs a roadmap before coding. Use "fast" to skip research phase.
argument-hint: [fast] [task]
---

# Planning

Create detailed technical implementation plans through research, codebase analysis, solution design, and comprehensive documentation.

## Core Rules

- Honor **YAGNI**, **KISS**, and **DRY** principles
- Be honest, brutal, straight to the point, and concise
- DO NOT implement code — only create plans
- Fully respect `./docs/development-rules.md` if it exists

## Workflow

### Fast Mode (keyword: "fast")

1. Spawn `planner` subagent → creates plan in `plans/YYYYMMDD-HHmm-plan-name/`
2. Spawn `plan-reviewer` subagent → validates
3. Report plan path and summary to user

### Full Mode (default)

1. **Initial Analysis** — Read codebase docs, understand context
2. **Research** — Spawn `researcher` subagents to investigate approaches
3. **Synthesis** — Analyze reports, identify optimal solution
4. **Plan Creation** — Spawn `planner` subagent → creates plan in `plans/YYYYMMDD-HHmm-plan-name/`
5. **Plan Review** — Spawn `plan-reviewer` subagent → validates

## Plan Directory Structure

```
plans/YYYYMMDD-HHmm-plan-name/
├── research/                # researcher-XX-report.md
├── reports/                 # XX-report.md
├── scout/                   # scout-XX-report.md
├── plan.md                  # Overview + links (keep short)
├── phase-XX-*.md            # Phase overview + links
└── changes/                 # Per-file change details
    ├── src--auth--login.ts.md
    ├── src--api--routes.ts.md
    └── ...
```

### plan.md Structure (overview only)

`plan.md` must be a **short overview** that links to sub-files. Do NOT inline per-file changes.

```markdown
# Plan: <Name>

## Problem
Brief problem statement.

## Approach
High-level solution summary.

## Phases
1. [Phase 1: Auth setup](./phase-01-auth-setup.md)
2. [Phase 2: API routes](./phase-02-api-routes.md)

## Files Affected
| File | Change Type | Details |
|------|-------------|---------|
| `src/auth/login.ts` | modify | [→ changes](./changes/src--auth--login.ts.md) |
| `src/api/routes.ts` | create | [→ changes](./changes/src--api--routes.ts.md) |
```

### changes/ Sub-files

Each file in `changes/` describes what to change in ONE source file. Filename uses `--` as path separator (e.g., `src--auth--login.ts.md`).

```markdown
# src/auth/login.ts (modify)

## Why
Brief reason for changes.

## Changes
1. Add `validateToken()` function after line ~42
2. Update `login()` to call `validateToken()` before session creation
3. Add error handling for expired tokens

## Code Snippets
(pseudocode or actual code for non-obvious changes)
```

### phase-XX-*.md Structure

Each phase links to its relevant `changes/` files:

```markdown
# Phase 1: Auth Setup

## Goal
What this phase achieves.

## Tasks
1. Create token validation — [src/auth/login.ts](./changes/src--auth--login.ts.md)
2. Add auth middleware — [src/middleware/auth.ts](./changes/src--middleware--auth.ts.md)

## Dependencies
- None (first phase)

## Success Criteria
- Token validation passes unit tests
- Auth middleware blocks unauthorized requests
```

## Output

- Respond with plan file path and summary
- Keep `plan.md` as a short index — detail lives in sub-files
- Include code snippets/pseudocode in `changes/` files when clarifying
- Provide multiple options with trade-offs when appropriate
- Make plans detailed enough for junior developers

## Quality Standards

- Be thorough and specific
- Consider long-term maintainability
- Research thoroughly when uncertain
- Address security and performance concerns
- Validate against existing codebase patterns
