---
name: plan-execute
description: Execute split plans with parallel agents, respecting dependencies
argument-hint: <split-dir-path>
---

# Plan Executor

Orchestrate parallel execution of split plans by spawning agents and managing dependencies.

## When to Use

Use this skill when:
- Have split plans from `/plan-split`
- Want to run multiple agents in parallel
- Need automated dependency management
- Want progress tracking across agents

## Core Behavior

- **Parallel execution** - Independent agents run simultaneously
- **Dependency blocking** - Wait for prerequisites before starting
- **Progress tracking** - Update `_tracker.md` in real-time
- **Failure handling** - Stop dependent agents if prerequisite fails

## Workflow

1. **Read Tracker** - Parse `_tracker.md` for agent assignments
2. **Build Execution Graph** - Identify parallel vs sequential agents
3. **Spawn Wave 1** - Start all agents with no dependencies (parallel)
4. **Monitor Progress** - Watch for completion/failure
5. **Spawn Next Waves** - Start blocked agents when dependencies resolve
6. **Final Report** - Summary of all agent outcomes

## Input

Path to split directory containing:
```
split/
├── _tracker.md
├── agent-1-scope.md
├── agent-2-scope.md
└── agent-N-scope.md
```

## Execution Strategy

### Wave-based Parallelism

```
Wave 1: [Agent 1, Agent 2]     # No dependencies - parallel
         ↓ wait
Wave 2: [Agent 3]              # Depends on 1,2
         ↓ wait
Wave 3: [Agent 4]              # Depends on 3
```

### Agent Spawning

For each agent, spawn using Agent tool:
```
Agent(
  prompt: "Execute plan in agent-N-scope.md.
           Read _tracker.md first.
           Update tracker after each major task.
           Write handoff notes when done.",
  tools: [Read, Write, Edit, Bash, Glob, Grep, ...],
  subagent_type: "general"
)
```

## Tracker Updates

Update `_tracker.md` status field:
| Status | Meaning |
|--------|---------|
| pending | Not started |
| in-progress | Agent running |
| completed | Successfully finished |
| failed | Error occurred |
| blocked | Waiting for dependencies |

Append to Progress Log:
```markdown
## Progress Log
- [HH:mm] Agent 1: Started
- [HH:mm] Agent 1: Completed task 1/3
- [HH:mm] Agent 2: Started
- [HH:mm] Agent 1: Completed - all tasks done
- [HH:mm] Agent 3: Unblocked, starting...
```

## Instructions

1. **Parse Input**
   - Read `_tracker.md` from provided split directory
   - Extract agent list, dependencies, file ownership

2. **Plan Execution Waves**
   - Group agents by dependency level
   - Wave 1: agents with no dependencies
   - Wave N: agents whose dependencies are all in earlier waves

3. **Execute Wave 1**
   - Spawn all Wave 1 agents in parallel using Agent tool
   - Each agent receives their plan file path
   - Update tracker status to "in-progress"

4. **Monitor & Progress**
   - Wait for agents to complete
   - Update tracker as agents finish
   - Handle failures (mark as failed, note in tracker)

5. **Execute Subsequent Waves**
   - When all dependencies of an agent complete successfully
   - Spawn that agent
   - Continue until all agents done or blocked by failure

6. **Final Report**
   - Summary table of all agents
   - Total time, success/failure count
   - Any handoff notes or issues

## Agent Prompt Template

```markdown
# Your Assignment

Execute the plan in: {agent_plan_path}

## Before Starting
1. Read `_tracker.md` for overall context
2. Check handoff notes from completed agents
3. Verify your dependencies are marked "completed"

## During Execution
1. Work through tasks in order
2. Only modify files in your "OWN" list
3. You may read files in "READ" list for context
4. Update `_tracker.md` Progress Log after major tasks

## After Completion
1. Mark your status as "completed" in tracker
2. Write handoff notes for dependent agents
3. Report completion summary
```

## Error Handling

**Agent Failure:**
1. Mark agent status as "failed" in tracker
2. Add error details to Progress Log
3. Mark dependent agents as "blocked"
4. Report which agents cannot proceed
5. Ask user: retry, skip, or abort?

**Dependency Deadlock:**
- Detect circular dependencies during planning
- Report error before execution starts

## Usage

```bash
# After splitting a plan
/plan-split plans/260306-auth/plan.md

# Execute the split
/plan-execute plans/260306-auth/split/

# Output:
# - Spawns agents in waves
# - Updates _tracker.md in real-time
# - Reports final status
```

## Example Output

```
## Execution Summary

Plan: user-authentication
Duration: 12m 34s

| Agent | Scope | Status | Duration |
|-------|-------|--------|----------|
| 1 | frontend | completed | 4m 12s |
| 2 | backend | completed | 5m 45s |
| 3 | tests | completed | 6m 22s |

All agents completed successfully.
Files modified: 23
Tests passing: 47/47
```

## Quality Checklist

Before starting execution:
- [ ] All agent plan files exist
- [ ] Tracker has valid structure
- [ ] No circular dependencies
- [ ] File ownership has no conflicts

During execution:
- [ ] Tracker updated after each state change
- [ ] Failures logged with context
- [ ] Dependent agents properly blocked
