# SRS Validation Checklists

## Requirement Quality Checklist (SMART)

For each requirement verify:

### S - Specific
- [ ] Clear and precise, no ambiguous terms
- [ ] "User" and actors clearly defined
- [ ] Scope is bounded

### M - Measurable
- [ ] Success criteria verifiable
- [ ] Quantitative metrics where applicable
- [ ] Test method clear

### A - Achievable
- [ ] Technically feasible
- [ ] Resources available
- [ ] Within project constraints

### R - Relevant
- [ ] Traces to business objective
- [ ] Provides value to stakeholders

### T - Time-bound
- [ ] Priority assigned (M/S/C/W)
- [ ] Phase/release identified

---

## Functional Requirement Checklist

### Identification
- [ ] Unique ID (FR-XXX)
- [ ] Descriptive title
- [ ] Category/feature area identified

### Description
- [ ] Uses "shall" for mandatory
- [ ] Single requirement per statement
- [ ] Active voice, no implementation details

### Completeness
- [ ] Inputs specified
- [ ] Processing logic described
- [ ] Outputs defined
- [ ] Error handling addressed

### Traceability
- [ ] Source documented
- [ ] Business objective linked
- [ ] Test cases mapped

---

## Non-Functional Requirement Checklist

### Performance
- [ ] Response time with metrics specified
- [ ] Throughput quantified
- [ ] Concurrent user capacity defined

### Security
- [ ] Authentication method specified
- [ ] Authorization levels defined
- [ ] Data encryption requirements stated

### Reliability
- [ ] Availability target (e.g., 99.9%)
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

### Usability
- [ ] Accessibility standards (WCAG)
- [ ] Error message guidelines

---

## Document Completeness Checklist

### Section 1: Introduction
- [ ] 1.1 Purpose clearly stated
- [ ] 1.2 Scope with product name
- [ ] 1.3 All terms defined
- [ ] 1.4 References listed

### Section 2: Overall Description
- [ ] 2.1 System context and interfaces
- [ ] 2.2 Product functions summarized
- [ ] 2.3 User classes defined
- [ ] 2.4 Constraints documented
- [ ] 2.5 Assumptions and dependencies listed

### Section 3: Specific Requirements
- [ ] 3.1 External interfaces detailed
- [ ] 3.2 Functional requirements with unique IDs
- [ ] 3.3 NFRs (Performance, Security, Reliability, Usability)
- [ ] 3.4 Design constraints

### Appendices
- [ ] Glossary complete
- [ ] Traceability matrix

---

## Requirement ID Conventions

### Functional Requirements
```
FR-XXX: Core functional
FR-AUTH-XXX: Authentication
FR-RPT-XXX: Reporting
FR-INT-XXX: Integration
```

### Non-Functional Requirements
```
NFR-PERF-XXX: Performance
NFR-SEC-XXX: Security
NFR-REL-XXX: Reliability
NFR-USA-XXX: Usability
NFR-MAINT-XXX: Maintainability
```

### Constraints
```
CON-XXX: General
CON-REG-XXX: Regulatory
CON-TECH-XXX: Technical
```

---

## Priority Levels (MoSCoW)

| Priority | Code | Description |
|----------|------|-------------|
| Must Have | M | Critical for success |
| Should Have | S | Important but not critical |
| Could Have | C | Nice to have |
| Won't Have | W | Out of scope |

---

## Writing Style Guide

**DO:**
- Use "shall" for mandatory requirements
- Use "should" for desirable requirements
- Be specific and quantitative
- One requirement per statement
- Write in active voice

**DON'T:**
- Use vague terms (fast, user-friendly)
- Combine multiple requirements
- Include design/implementation details
