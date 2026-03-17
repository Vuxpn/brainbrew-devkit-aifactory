---
name: plan-review
description: Review and validate implementation plans for completeness, feasibility, and quality
argument-hint: <plan-path>
---

# Plan Reviewer

Critically review implementation plans to identify gaps, risks, and improvement opportunities before execution.

## When to Use

Use this skill when:
- Validating plans from `/plan` before implementation
- Reviewing split plans from `/plan-split`
- Checking plan quality before `/plan-execute`
- Getting second opinion on technical approach

## Core Principles

- **Brutal honesty** - Flag issues directly, no sugar-coating
- **Feasibility focus** - Can this actually be implemented?
- **Completeness check** - Are all requirements covered?
- **Risk identification** - What could go wrong?

## Review Checklist

### 1. Structure & Clarity
- [ ] Clear problem statement
- [ ] Well-defined scope boundaries
- [ ] Logical task ordering
- [ ] Appropriate granularity (not too vague, not too detailed)

### 2. Technical Feasibility
- [ ] Technologies/tools are appropriate
- [ ] Dependencies are available
- [ ] No impossible requirements
- [ ] Performance considerations addressed

### 3. Completeness
- [ ] All requirements covered
- [ ] Edge cases considered
- [ ] Error handling planned
- [ ] Testing strategy included

### 4. Dependencies & Risks
- [ ] External dependencies identified
- [ ] Blocking risks noted
- [ ] Fallback options provided
- [ ] Timeline realistic

### 5. Implementation Readiness
- [ ] Tasks are actionable
- [ ] Success criteria defined
- [ ] Sufficient context for implementer
- [ ] No ambiguous instructions

## Review Output Format

```markdown
# Plan Review: <Plan Name>
Reviewed: YYYY-MM-DD HH:mm
Reviewer: plan-review skill

## Summary
**Verdict:** APPROVED | NEEDS REVISION | REJECTED
**Confidence:** High | Medium | Low
**Estimated Effort:** X hours/days

## Strengths
- What the plan does well
- Good decisions made

## Issues Found

### Critical (must fix before implementation)
1. **Issue title**
   - Problem: description
   - Impact: what breaks if ignored
   - Suggestion: how to fix

### Major (should fix)
1. ...

### Minor (nice to fix)
1. ...

## Missing Elements
- [ ] Missing requirement X
- [ ] No error handling for Y
- [ ] Edge case Z not covered

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | Suggested action |

## Questions for Clarification
1. Question that needs user input?

## Recommendations
1. Specific actionable recommendation
2. ...

## Verdict Details
Why the verdict was given and conditions for approval.
```

## Review Process

1. **Read Plan** - Parse full plan content
2. **Context Check** - Read related docs if referenced
3. **Structural Analysis** - Check organization and flow
4. **Technical Validation** - Verify feasibility
5. **Gap Analysis** - Find missing pieces
6. **Risk Assessment** - Identify potential failures
7. **Generate Report** - Create review document

## Severity Definitions

| Level | Definition | Action Required |
|-------|------------|-----------------|
| **Critical** | Blocks implementation or causes failure | Must fix before proceeding |
| **Major** | Significant risk or quality issue | Should fix, may proceed with caution |
| **Minor** | Improvement opportunity | Optional, can fix during implementation |

## Verdict Criteria

**APPROVED**
- No critical issues
- All requirements covered
- Technically feasible
- Ready for implementation

**NEEDS REVISION**
- Has critical or multiple major issues
- Missing important elements
- Requires clarification
- Fixable with moderate effort

**REJECTED**
- Fundamentally flawed approach
- Infeasible requirements
- Major scope misunderstanding
- Needs complete rethink

## Usage

```bash
# Review a plan
/plan-review plans/260306-feature/plan.md

# Review split plans
/plan-review plans/260306-feature/split/

# Output: review report with verdict
```

## Integration with Other Skills

```
/plan → creates plan
    ↓
/plan-review → validates quality
    ↓ (if APPROVED)
/plan-split → decomposes for parallel work
    ↓
/plan-review → validates split plans
    ↓ (if APPROVED)
/plan-execute → runs agents
```

## Instructions

1. Read the provided plan file(s)
2. Check codebase context if plan references existing code
3. Apply review checklist systematically
4. Identify issues by severity
5. Generate review report in specified format
6. Provide clear verdict with justification
7. Save report to `plans/<plan-name>/review.md`
