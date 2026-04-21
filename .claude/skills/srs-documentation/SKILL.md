---
name: srs-documentation
description: >-
  Use when generating formal Software Requirements Specification (SRS) documents following IEEE 830 standard, compiling gathered requirements into structured documentation, or validating requirements quality. TRIGGERS: "create SRS", "write requirements spec", "IEEE 830", "requirements document", "SRS template". This skill provides SRS document templates, validation checklists, and requirements engineering guidance.
---

# SRS Documentation

## Overview

Create and validate formal SRS documents following IEEE 830 standard. Use `references/template.md` for document structure, `references/checklists.md` for validation.

## Quick Start

1. **Create SRS**: Use `references/template.md` as starting point
2. **Validate Requirements**: Apply `references/checklists.md` SMART/INVEST criteria
3. **Organize**: Follow IEEE 830 section numbering
4. **ID Requirements**: FR-XXX, NFR-PERF/SEC/REL/USA/MAINT-XXX format

## Key Patterns

### Requirement Format
```
FR-001: The system shall [behavior]
- Priority: M/S/C/W (MoSCoW)
- Source: [Stakeholder/Document]
- Acceptance Criteria: [Measurable criteria]
```

### Section Structure
1. Introduction (Purpose, Scope, Definitions)
2. Overall Description (Context, Functions, Users, Constraints)
3. Specific Requirements (Functional, Non-Functional, External Interfaces)
4. Appendices (Glossary, Traceability, Models)

## Reference Files

| File | Use |
|------|-----|
| `references/template.md` | Full IEEE 830 template with all sections |
| `references/checklists.md` | Validation checklists (SMART, INVEST, completeness) |
