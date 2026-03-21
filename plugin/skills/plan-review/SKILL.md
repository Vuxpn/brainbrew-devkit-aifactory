---
name: plan-review
description: Review and validate implementation plans for completeness, feasibility, and quality. Use when user says "review this plan", "check my plan", "validate the approach", or after /plan creates a plan. Also triggers automatically in the plan chain.
argument-hint: [plan-path]
---

# Plan Reviewer

Critically review implementation plans to identify gaps, risks, and improvement opportunities before execution.

## Core Principles

- **Brutal honesty** — Flag issues directly, no sugar-coating
- **Feasibility focus** — Can this actually be implemented?
- **Completeness check** — Are all requirements covered?
- **Risk identification** — What could go wrong?

## Review Checklist

### 1. Structure & Clarity
- Clear problem statement
- Well-defined scope boundaries
- Logical task ordering
- Appropriate granularity (not too vague, not too detailed)

### 2. Technical Feasibility
- Technologies/tools are appropriate
- Dependencies are available
- No impossible requirements
- Performance considerations addressed

### 3. Completeness
- All requirements covered
- Edge cases considered
- Error handling planned
- Testing strategy included

### 4. Dependencies & Risks
- External dependencies identified
- Blocking risks noted
- Fallback options provided

### 5. Implementation Readiness
- Tasks are actionable
- Success criteria defined
- Sufficient context for implementer
- No ambiguous instructions

## Review Process

1. **Read Plan** — Parse full plan content
2. **Context Check** — Read related docs if referenced
3. **Structural Analysis** — Check organization and flow
4. **Technical Validation** — Verify feasibility
5. **Gap Analysis** — Find missing pieces
6. **Risk Assessment** — Identify potential failures
7. **Generate Report** — Save to `plans/<plan-name>/review.md`

## Output Format

```markdown
# Plan Review: <Plan Name>
Reviewed: YYYY-MM-DD HH:mm

## Summary
**Verdict:** APPROVED | NEEDS REVISION | REJECTED
**Confidence:** High | Medium | Low

## Strengths
- What the plan does well

## Issues Found

### Critical (must fix before implementation)
1. **Issue** — Problem, impact, suggestion

### Major (should fix)
1. ...

### Minor (nice to fix)
1. ...

## Missing Elements
- Missing requirement X

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|

## Questions for Clarification
1. ...

## Verdict Details
Why the verdict was given and conditions for approval.
```

## Verdict Criteria

| Verdict | Criteria |
|---------|----------|
| **APPROVED** | No critical issues, all requirements covered, technically feasible |
| **NEEDS REVISION** | Has critical/major issues, missing elements, fixable with moderate effort |
| **REJECTED** | Fundamentally flawed, infeasible, needs complete rethink |

## Severity Definitions

| Level | Definition | Action |
|-------|------------|--------|
| **Critical** | Blocks implementation or causes failure | Must fix before proceeding |
| **Major** | Significant risk or quality issue | Should fix, may proceed with caution |
| **Minor** | Improvement opportunity | Optional, can fix during implementation |
