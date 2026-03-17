---
name: quality
description: ⚡ Orchestrate comprehensive quality assurance and testing workflows
argument-hint: [operation] [scope]
---

# Quality

Orchestrate systematic quality management workflows using `code-reviewer` and `tester` subagents.

## Variables

- OPERATION: $1 (audit, validate, enforce, improve)
- SCOPE: $2 (feature, release, codebase)

## Workflow

### 1. Code Review
Use `code-reviewer` subagent to:
- Review code quality and patterns
- Check security vulnerabilities
- Verify error handling
- Assess maintainability

### 2. Testing
Use `tester` subagent to:
- Run unit tests
- Execute integration tests
- Verify edge cases
- Check test coverage

### 3. Analysis
Use `debugger` subagent if issues found:
- Investigate failures
- Find root causes
- Suggest fixes

### 4. Report
Output to: `plans/<plan-name>/reports/quality-report.md`

## Quality Gates

- All tests pass
- No critical code review issues
- Coverage meets threshold
- No security vulnerabilities

## Important

- Coordinate review → test → debug cycle
- Generate actionable improvement plans
- Track quality metrics
