---
name: plan-split
description: Split large plans into parallelizable agent tasks with file-based isolation
argument-hint: <plan-path>
---

# Plan Splitter

Decompose large implementation plans into parallelizable sub-plans for multi-agent execution with zero file conflicts.

## When to Use

Use this skill when:
- `/plan` output is too large for single-agent implementation
- Tasks can be parallelized across multiple agents
- Need coordinated multi-agent workflow with shared context
- Want to speed up implementation through concurrent work

## Core Principles

- **Zero file overlap** - Each agent owns exclusive files
- **Dependency awareness** - Respect task ordering constraints
- **Shared context** - Central tracker for coordination
- **Bounded agents** - 2-5 agents (less overhead, more parallelism)

## Workflow

1. **Parse Plan** - Read plan file, extract phases/tasks/files
2. **Build Dependency Graph** - Identify task dependencies
3. **Detect Boundaries** - Use hybrid detection:
   - Tier 1: Explicit plan phases
   - Tier 2: Directory clustering
   - Tier 3: Architectural layers (frontend/backend/tests)
4. **Assign Ownership** - Map files exclusively to agents
5. **Generate Output** - Create tracker + agent plans

## Output Structure

```
plans/<original-plan-name>/
├── plan.md                    # Original plan
└── split/
    ├── _tracker.md            # Shared progress tracker
    ├── agent-1-<scope>.md     # Agent 1's tasks
    ├── agent-2-<scope>.md     # Agent 2's tasks
    └── agent-N-<scope>.md     # Additional agents
```

## Tracker Format

Create `_tracker.md` with this structure:

```markdown
# Plan Split: <Plan Name>
Generated: YYYY-MM-DD HH:mm
Source: <original-plan-path>

## Agent Assignments
| Agent | Scope | Status | Owned Files | Depends On |
|-------|-------|--------|-------------|------------|
| 1 | frontend | pending | src/components/*, src/pages/* | - |
| 2 | backend | pending | src/api/*, src/services/* | - |
| 3 | tests | blocked | tests/* | 1, 2 |

## Execution Order
1. Agents 1, 2 can start immediately (parallel)
2. Agent 3 waits for 1, 2 completion

## Progress Log
<!-- Agents append updates here -->

## Handoff Notes
<!-- Cross-agent communication -->
```

## Agent Plan Format

Create `agent-N-<scope>.md` with this structure:

```markdown
# Agent N: <Scope Name>

## Coordination
- **Tracker**: Read `_tracker.md` before starting
- **Update**: Append progress after each major task
- **Handoff**: Write notes for dependent agents

## File Ownership
**You OWN (exclusive write):**
- path/to/file1.ts
- path/to/dir/*

**You may READ (no edit):**
- shared/types/*
- constants/*

## Dependencies
- None - start immediately
- OR: Wait for Agent X: "<specific deliverable>"

## Tasks
1. [ ] Task description
2. [ ] Task description
3. [ ] Task description

## Success Criteria
- [ ] All tasks completed
- [ ] Tracker updated with final status
- [ ] Handoff notes written (if dependents exist)
```

## Agent Count Detection

```
optimal = count(independent_task_clusters)
final = clamp(optimal, min=2, max=5)
```

Detection factors:
| Factor | Weight | Logic |
|--------|--------|-------|
| Independent task clusters | High | Tasks with no cross-dependencies |
| Directory spread | Medium | Files in different directories |
| Plan size | Low | >20 tasks suggests more agents |

## Boundary Detection Algorithm

**Tier 1: Plan Structure**
- If plan has explicit phases, use phases as agent boundaries
- Example: "Phase 1: Frontend, Phase 2: Backend" = 2 agents

**Tier 2: Directory Clustering**
- Map tasks to files to directories
- Cluster by common parent directories
- Example: src/components/*, src/api/* = 2 agents

**Tier 3: Architectural Layers**
- Detect common patterns:
  - frontend/ backend/ = layer split
  - features/*/ = feature split
  - src/[type]/ = type split

## Usage Example

```bash
# After creating a plan
/plan implement user authentication system

# Split for parallel execution
/plan-split plans/260306-1130-user-auth/plan.md

# Output created:
# plans/260306-1130-user-auth/split/_tracker.md
# plans/260306-1130-user-auth/split/agent-1-frontend.md
# plans/260306-1130-user-auth/split/agent-2-backend.md
# plans/260306-1130-user-auth/split/agent-3-tests.md
```

## Quality Checklist

Before finalizing split:
- [ ] Zero file overlap between agents verified
- [ ] Dependency ordering is correct
- [ ] Agent scopes are balanced (similar workload)
- [ ] Read-only files included for context
- [ ] Tasks are self-contained within scope

## Instructions

1. Read the provided plan file
2. Analyze structure for phases, tasks, and file references
3. Build dependency graph between tasks
4. Apply boundary detection (tiers 1-3)
5. Calculate optimal agent count (2-5)
6. Assign files exclusively to agents
7. Generate `_tracker.md` in `split/` subdirectory
8. Generate `agent-N-<scope>.md` for each agent
9. Report summary: agent count, scopes, execution order
