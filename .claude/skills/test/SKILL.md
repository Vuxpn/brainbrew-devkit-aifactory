---
name: test
description: ⚡ Orchestrate comprehensive testing workflows and quality validation
argument-hint: [test-type] [scope]
---

## Purpose

Orchestrate systematic testing workflows using the `tester` orchestrator to coordinate test execution, coverage analysis, performance validation, and build verification across multiple testing frameworks.

## Variables

TEST_TYPE: $1 (unit, integration, e2e, performance, regression, all)
SCOPE: $2 (feature, module, system, codebase)
REPORT_OUTPUT_DIR: `plans/<plan-name>/reports/test-report.md`

## Workflow:

Use the `tester` orchestrator to:
- Coordinate comprehensive test execution across multiple frameworks and levels
- Orchestrate code coverage analysis and quality metric collection
- Manage performance validation and regression testing workflows
- Execute build verification and compatibility testing
- Synthesize test results into actionable quality intelligence

**Testing orchestration requirements:**
- **IMPORTANT:** Coordinate testing across unit, integration, and e2e levels systematically
- **IMPORTANT:** Generate comprehensive coverage analysis with gap identification
- **IMPORTANT:** Validate both happy path and error scenarios systematically
- **IMPORTANT:** Create detailed quality metrics with trend analysis
- **IMPORTANT:** Provide actionable improvement recommendations with specific test additions

**IMPORTANT**: Do not start implementing - orchestrate testing and analysis only.
**IMPORTANT**: Analyze the skills catalog and activate skills needed for the task.
