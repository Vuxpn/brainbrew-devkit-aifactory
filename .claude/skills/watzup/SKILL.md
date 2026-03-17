---
name: watzup
description: ⚡ Review recent changes and wrap up the work
---

# Watzup

Review recent changes, assess quality, and wrap up work session.

## Workflow

### 1. Gather Changes
- Run `git status` and `git diff` to see current changes
- Run `git log --oneline -10` to see recent commits

### 2. Summary
Report:
- Files modified/added/removed
- Key changes made
- Overall scope (small fix, feature, refactor)

### 3. Quality Review
Use `code-reviewer` subagent to:
- Quick review of changed files
- Check for obvious issues
- Assess code quality

### 4. Documentation Check
Use `docs-manager` agent to:
- Analyze changes (from step 1) to determine affected docs
- Update only relevant docs in `./docs/`
- Report which docs updated/skipped

### 5. Recommendations
Based on review:
- **Ready to commit?** → suggest commit message
- **Needs fixes?** → list issues to address
- **Needs tests?** → suggest test coverage
- **Docs updated?** → confirm doc changes

## Output Format

```
## Session Summary
- Scope: [small fix | feature | refactor | etc]
- Files changed: X modified, Y added, Z removed

## Changes
- [bullet list of key changes]

## Review
- Quality: [good | needs work]
- Issues: [if any]

## Next Steps
- [ ] [recommended action 1]
- [ ] [recommended action 2]
```

## Important
- DO NOT implement fixes - only review and suggest
- Keep summary concise
- Prioritize actionable recommendations
