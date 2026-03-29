# Develop Template

Full development workflow with automatic code review, testing, and git management.

## Chain Flow

```
planner → plan-reviewer → implementer → parallel-review (team) → tester → git-manager
              ↓ ISSUES        ↓ ISSUES        ↓ ISSUES         ↓ FAIL
            planner        implementer      implementer     debugger → implementer
```

## Agents Included

- **planner** — Creates implementation plans
- **plan-reviewer** — Reviews and approves plans
- **implementer** — Writes code based on plan
- **code-reviewer** — Reviews code quality
- **security-scan** — Scans for security vulnerabilities
- **tester** — Runs tests
- **debugger** — Fixes failing tests
- **git-manager** — Commits and creates PRs

## Features

- **Parallel review** — Code quality and security checks run simultaneously
- **Auto-retry** — Issues route back to implementer automatically
- **Test recovery** — Failures route to debugger, then retry tests
- **Git automation** — Commits and PRs created automatically

## Usage

```
mcp__brainbrew__template_bump(template: "develop")
```

Then restart Claude Code and use:

```
/code implement feature X
```

## Flow Config

```yaml
flow:
  planner:
    routes:
      plan-reviewer: "Plan created"

  plan-reviewer:
    routes:
      implementer: "Plan approved"
      planner: "Plan has issues"
    decide: |
      If plan is APPROVED → "implementer"
      If plan has ISSUES → "planner"

  implementer:
    routes:
      parallel-review: "Code implemented"

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
      implementer: "Issues found"
    decide: |
      If ALL reviews PASSED → "tester"
      If ANY issues found → "implementer"

  tester:
    routes:
      git-manager: "Tests passed"
      debugger: "Tests failed"
    decide: |
      If tests PASSED → "git-manager"
      If tests FAILED → "debugger"

  debugger:
    routes:
      implementer: "Fix identified"

  git-manager:
    routes:
      END: "PR created"
```
