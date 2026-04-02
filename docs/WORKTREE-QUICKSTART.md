# Worktree Isolation - Quick Start

## TL;DR

Worktree isolation creates safe sandboxes for agents to work in, preventing broken code from affecting your main codebase.

## Setup (Already Done ✅)

Worktree isolation is enabled by default in `chain-config.json`:

```json
{
  "isolation": {
    "enabled": true,
    "method": "worktree"
  },
  "agents": {
    "implementer": { "isolation": "worktree" },
    "debugger": { "isolation": "worktree" }
  }
}
```

## Usage Flow

### 1. Agent Works in Isolation

When you run `/code` or spawn an `implementer`:

```
✅ Worktree created: .claude/worktrees/implementer-abc123
📝 Agent works in isolated directory
💾 Auto-commit when agent finishes
```

### 2. Review Changes

```bash
# List active worktrees
brainbrew worktree-review --list

# See what changed
brainbrew worktree-review --diff .claude/worktrees/implementer-abc123
```

### 3. Merge or Discard

```bash
# Merge into main (deletes worktree)
brainbrew worktree-review --merge .claude/worktrees/implementer-abc123

# OR discard changes
brainbrew worktree-review --remove .claude/worktrees/implementer-abc123
```

## Common Commands

| Command | Description |
|---------|-------------|
| `brainbrew worktree-review --list` | Show all active worktrees |
| `brainbrew worktree-review --diff <path>` | Review changes |
| `brainbrew worktree-review --merge <path>` | Merge & cleanup |
| `brainbrew worktree-review --merge <path> --keep` | Merge but keep worktree |
| `brainbrew worktree-review --remove <path>` | Discard changes |
| `brainbrew worktree-review --clean-all` | Remove all worktrees |
| `brainbrew worktree-review --session <id>` | Show session's worktree |

## When to Use

### ✅ Enable Worktree For:
- Code implementation (implementer)
- Debugging sessions (debugger)
- Refactoring work
- Experimental features
- High-risk changes

### ❌ Skip Worktree For:
- Planning (planner)
- Code review (code-reviewer)
- Research (researcher)
- Documentation (docs-manager)

## Benefits

1. **Interrupt Safety**: Claude interrupted mid-edit? Worktree has partial changes, main codebase safe
2. **Review Before Merge**: See all changes before they affect main branch
3. **Parallel Work**: Multiple agents can work simultaneously without conflicts
4. **Easy Rollback**: Just remove worktree to discard changes

## Example Session

```bash
# Start coding task
/code Fix the authentication bug

# Agent works in worktree...
# Agent finishes with worktree info

# Review what changed
brainbrew worktree-review --list
brainbrew worktree-review --diff .claude/worktrees/implementer-12345

# Looks good - merge it
brainbrew worktree-review --merge .claude/worktrees/implementer-12345

# Done! Changes are now in main branch
```

## Configuration

Edit `.claude/hooks/chains/chain-config.json`:

```json
{
  "isolation": {
    "enabled": true,        // Turn on/off globally
    "method": "worktree",   // 'worktree' or 'none'
    "autoCommit": true,     // Auto-commit when agent finishes
    "requireReview": false, // Require manual review before merge
    "cleanupOnSessionEnd": false // Auto-remove worktrees on session end
  }
}
```

## Troubleshooting

**Worktree creation fails:**
```bash
git worktree prune
brainbrew worktree-review --clean-all
```

**Want to see session worktree:**
```bash
brainbrew worktree-review --session <session-id>
brainbrew worktree-review --session <session-id> --diff
```

**Merge conflicts:**
```bash
# Manual resolution needed
cd .claude/worktrees/<worktree>
git rebase main
# Fix conflicts, then merge from main dir
```

## Files Added

- `src/utils/worktree.ts` - Core worktree utilities
- `src/commands/worktree-review.ts` - CLI command
- `src/hooks/subagent-start.ts` - Creates worktree on agent start
- `src/hooks/subagent-stop.ts` - Commits and reports on agent stop
- `docs/worktree-isolation.md` - Full documentation

## Next Steps

1. Try it: `/code Add a new feature`
2. Review: `brainbrew worktree-review --list`
3. Merge: `brainbrew worktree-review --merge <path>`

For full documentation, see [docs/worktree-isolation.md](./worktree-isolation.md)
