---
name: review
description: ⚡ Coordinate code quality assessment. Use "codebase" for full scan
argument-hint: [codebase] [scope] [focus-areas]
---

# Review

Orchestrate comprehensive code quality assessment workflows using the `code-reviewer` orchestrator.

## Modes

### Codebase Mode (keyword: "codebase")
Full codebase scan and analysis:
1. Use 2 `researcher` subagents in parallel (max 5 sources)
2. Use `scout` to search codebase
3. Use multiple `code-reviewer` subagents in parallel
4. Use `planner` to create improvement plan in `plans/YYYYMMDD-HHmm-plan-name/`
5. Report summary, suggest next steps
6. Ask user if they want to commit and push

### Standard Mode (default)
Focused review workflow:
- Use `code-reviewer` orchestrator to:
  - Coordinate multi-dimensional quality assessment
  - Manage security audits
  - Orchestrate performance analysis
  - Verify implementation completeness
  - Synthesize findings into actionable improvement plan

## Variables
- SCOPE: what to review (files, features, codebase)
- FOCUS_AREAS: security, performance, maintainability, completeness
- REPORT_OUTPUT_DIR: `plans/<plan-name>/reports/review-report.md`

## Output

This is **standalone review** - report findings to user, don't auto-fix.

Output format:
```
## Review Summary
- Critical: X issues
- Major: Y issues
- Minor: Z issues

## Issues Found
### Critical
1. [issue + location + suggested fix]

### Major
...

## Recommendations
- [prioritized improvement plan]
```

## Important
- Focus on critical issues over nitpicking
- Provide specific, actionable code examples
- Include security vulnerability assessments
- Prioritize by impact and effort
- Sacrifice grammar for concision
