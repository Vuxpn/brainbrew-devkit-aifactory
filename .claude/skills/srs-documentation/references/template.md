# IEEE 830 SRS Template

## Document Header

| Field | Value |
|-------|-------|
| Project Name | {PROJECT_NAME} |
| Document Version | {VERSION} |
| Date | {DATE} |
| Author | {AUTHOR} |
| Status | Draft / Under Review / Approved |

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | {DATE} | {AUTHOR} | Initial draft |

---

# 1. Introduction

## 1.1 Purpose
State purpose of the SRS document, identify intended audience, specify scope.

## 1.2 Scope
- Product name: {PRODUCT_NAME}
- What the software will do
- Application benefits, objectives, goals

## 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| SRS | Software Requirements Specification |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |

## 1.4 References
| Reference | Title | Version | Date |
|-----------|-------|---------|------|
| {REF_ID} | {TITLE} | {VERSION} | {DATE} |

## 1.5 Overview
Document organization and structure overview.

---

# 2. Overall Description

## 2.1 Product Perspective

### System Context
How product fits into larger system/business context.

### System Interfaces
| Interface | System | Description | Protocol |
|-----------|--------|-------------|----------|
| INT-001 | {SYSTEM} | {DESC} | {PROTOCOL} |

### User Interfaces
- Screen resolution: {RESOLUTION}
- Supported browsers: {BROWSERS}

### Software Interfaces
| Interface | Software | Version | Purpose |
|-----------|----------|---------|---------|
| SW-001 | {SOFTWARE} | {VER} | {PURPOSE} |

## 2.2 Product Functions

| Feature ID | Feature Name | Description |
|------------|--------------|-------------|
| F-001 | {FEATURE} | {DESC} |

## 2.3 User Characteristics

| User Class | Description | Technical Level |
|------------|-------------|-----------------|
| {USER_CLASS} | {DESC} | {LEVEL} |

## 2.4 Constraints
- Regulatory requirements
- Technical constraints
- Budget: {BUDGET}, Timeline: {TIMELINE}

## 2.5 Assumptions and Dependencies

| ID | Assumption | Impact if False |
|----|------------|-----------------|
| A-001 | {ASSUMPTION} | {IMPACT} |

---

# 3. Specific Requirements

## 3.1 External Interface Requirements

### User Interfaces
| UI-ID | Screen | Description |
|-------|--------|-------------|
| UI-001 | {SCREEN} | {DESC} |

### Software Interfaces
| SW-ID | Interface | Description |
|-------|-----------|-------------|
| SW-001 | {INTERFACE} | {DESC} |

## 3.2 Functional Requirements

### FR-XXX: {Requirement Title}

| Attribute | Value |
|-----------|-------|
| **ID** | FR-XXX |
| **Description** | The system shall... |
| **Priority** | M / S / C / W |
| **Source** | {Stakeholder} |
| **Status** | Proposed / Approved |

**Inputs:** {Input 1, Input 2}
**Processing:** 1. {Step 1} 2. {Step 2}
**Outputs:** {Output 1}
**Error Handling:** {Error}: {Response}
**Acceptance Criteria:**
- [ ] {Criterion 1}
- [ ] {Criterion 2}

## 3.3 Non-Functional Requirements

### NFR-PERF-XXX: {Title}
| Attribute | Value |
|-----------|-------|
| **ID** | NFR-PERF-XXX |
| **Description** | The system shall... |
| **Metric** | {Metric} |
| **Target** | {Value} |

### NFR-SEC-XXX: {Title}
| Attribute | Value |
|-----------|-------|
| **ID** | NFR-SEC-XXX |
| **Description** | The system shall... |
| **Category** | Auth / AuthZ / Data Protection / Audit |

### NFR-REL-XXX: {Title}
| Attribute | Value |
|-----------|-------|
| **ID** | NFR-REL-XXX |
| **Description** | The system shall... |
| **Metric** | Uptime / MTBF / Recovery Time |
| **Target** | {Value} |

### NFR-USA-XXX: {Title}
| Attribute | Value |
|-----------|-------|
| **ID** | NFR-USA-XXX |
| **Description** | The system shall... |
| **Measure** | {Measure} |

## 3.4 Design Constraints
| ID | Constraint | Rationale |
|----|------------|-----------|
| CON-001 | {CONSTRAINT} | {RATIONALE} |

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| {TERM} | {DEFINITION} |

# Appendix B: Requirements Traceability

## Business Objective to Requirement
| Business Objective | Requirements |
|--------------------|--------------|
| BO-001 | FR-001, FR-002 |

## Requirement to Test Case
| Requirement | Test Cases |
|-------------|------------|
| FR-001 | TC-001, TC-002 |
