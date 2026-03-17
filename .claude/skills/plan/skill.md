---
name: plan
description: ⚡⚡ Create technical implementation plans. Use "fast" for quick plans without research
argument-hint: [fast] [task]
---

# Planning

Create detailed technical implementation plans through research, codebase analysis, solution design, and comprehensive documentation.

## When to Use

Use this skill when:
- Planning new feature implementations
- Architecting system designs
- Evaluating technical approaches
- Creating implementation roadmaps
- Breaking down complex requirements
- Assessing technical trade-offs

## Core Responsibilities & Rules

Always honoring **YAGNI**, **KISS**, and **DRY** principles.
**Be honest, be brutal, straight to the point, and be concise.**

## Workflow

### Fast Mode (keyword: "fast")
Skip research phase:
1. Use `planner` subagent to create plan in `plans/YYYYMMDD-HHmm-plan-name/`
2. Use `plan-reviewer` subagent to verify
3. Report to user

### Full Mode (default)
1. **Initial Analysis** → Read codebase docs, understand context
2. **Research Phase** → Spawn `researcher` subagents, investigate approaches
3. **Synthesis** → Analyze reports, identify optimal solution
4. **Plan Creation** → Use `planner` subagent to create plan in `plans/YYYYMMDD-HHmm-plan-name/`
5. **Plan Review** → Use `plan-reviewer` subagent to verify

## Output Requirements

- DO NOT implement code - only create plans
- Respond with plan file path and summary
- Ensure self-contained plans with necessary context
- Include code snippets/pseudocode when clarifying
- Provide multiple options with trade-offs when appropriate
- Fully respect the `./docs/development-rules.md` file

**Plan Directory Structure**
```
plans/
└── YYYYMMDD-HHmm-plan-name/
    ├── research/
    │   ├── researcher-XX-report.md
    │   └── ...
    ├── reports/
    │   ├── XX-report.md
    │   └── ...
    ├── scout/
    │   ├── scout-XX-report.md
    │   └── ...
    ├── plan.md
    ├── phase-XX-phase-name-here.md
    └── ...
```

## Quality Standards

- Be thorough and specific
- Consider long-term maintainability
- Research thoroughly when uncertain
- Address security and performance concerns
- Make plans detailed enough for junior developers
- Validate against existing codebase patterns

**Remember:** Plan quality determines implementation success. Be comprehensive and consider all solution aspects.
