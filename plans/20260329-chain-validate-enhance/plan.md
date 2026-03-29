# Plan: Enhance chain_validate MCP Tool

## Goal

Extend `chain_validate` in `src/mcp/server.ts` to validate agent file format, skill directory structure, and cross-references between agents and skills.

## Current State

- `chain_validate` (lines 229-343 of `server.ts`) validates: agent file existence, team node structure, route targets, dead-end nodes
- Agent files: `.claude/agents/{name}.md` with YAML frontmatter (`---` delimited) containing `name` and `description`
- Skill files: `.claude/skills/{name}/SKILL.md` (or `skill.md`) with YAML frontmatter containing `name` and `description`
- Exception: `.claude/skills/common/` has `README.md` instead of `SKILL.md` (utility dir, not a real skill)

## Phase 1: Extract YAML Frontmatter Parser

**File**: `src/mcp/server.ts`

Add a helper function (before the `chain_validate` case) that parses YAML frontmatter from markdown files. Since the project has no YAML parser dependency and frontmatter is simple key-value, use a lightweight regex-based approach.

```typescript
function parseFrontmatter(filePath: string): { valid: boolean; fields: Record<string, string>; error?: string } {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { valid: false, fields: {}, error: 'No YAML frontmatter found' };

  const fields: Record<string, string> = {};
  let currentKey = '';
  let currentValue = '';
  for (const line of match[1].split('\n')) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      if (currentKey) fields[currentKey] = currentValue.trim();
      currentKey = kvMatch[1];
      currentValue = kvMatch[2].replace(/^>-?\s*$/, '');
    } else if (currentKey && line.match(/^\s+/)) {
      currentValue += ' ' + line.trim();
    }
  }
  if (currentKey) fields[currentKey] = currentValue.trim();
  return { valid: true, fields };
}
```

This handles:
- Standard `key: value`
- Multi-line values with `>-` or indented continuation
- Returns parsed fields for downstream checks

## Phase 2: Agent File Format Validation

**File**: `src/mcp/server.ts` -- inside `chain_validate` case, after the existing agent file existence checks (around line 320).

For each agent referenced by the chain (both direct nodes and team member agents):

1. Check frontmatter exists (already have file existence)
2. Parse frontmatter with `parseFrontmatter()`
3. Validate `name` field present and non-empty
4. Validate `description` field present and non-empty
5. Push warnings/errors to `issues[]`

Severity:
- Missing frontmatter: error
- Missing `name`: error
- Missing `description`: warning

## Phase 3: Skill Directory Validation

**File**: `src/mcp/server.ts` -- new block inside `chain_validate` case, after agent validation.

Scan `.claude/skills/` directory:

1. List all subdirectories
2. For each subdir, look for `SKILL.md` or `skill.md` (case-insensitive match)
3. If neither found, report warning (skip `common/` which uses `README.md`)
4. If found, parse frontmatter and check `name` and `description` fields
5. Collect all valid skill names into a `Set<string>`

Issues to report:
- Skill dir with no `SKILL.md`/`skill.md`: warning
- Skill file with no frontmatter: warning
- Skill missing `name` field: warning
- Skill missing `description` field: warning

## Phase 4: Cross-Reference Validation

**File**: `src/mcp/server.ts` -- new block inside `chain_validate` case, after skill validation.

1. For each agent file referenced in the chain, read its full content
2. Search for skill references using pattern: mentions of skill names in backticks or after "use" keyword (e.g., `` `planning` skills``, `` `debugging` skills``, `` `docs-seeker` skill``)
3. Extract referenced skill names via regex: `/`([a-z][\w-]*)`\s*skills?/gi`
4. Check if referenced skill exists in the collected skill names set
5. Report missing skills as warnings

This is best-effort -- skill references in agent prose are not formalized, so false positives are acceptable as warnings (not errors).

## Phase 5: Update Summary Output

Update the success message to include new validation counts:

```
Chain "X" is valid

Nodes: N
Agents installed: N
Agent format issues: N
Skills installed: N
Skill format issues: N
Team nodes: N
```

## Implementation Details

### Files to Modify

| File | Change |
|------|--------|
| `src/mcp/server.ts` | Add `parseFrontmatter()` helper, extend `chain_validate` case |

### No New Files or Dependencies

All changes are contained in `server.ts`. The frontmatter parser is lightweight and does not require a YAML library.

### Specific Code Locations

1. **`parseFrontmatter` helper**: Add near line 433 (in the Helpers section), alongside `success()` and `error()`
2. **Agent format validation**: Insert after line 322 (after the `for` loop that checks agent existence)
3. **Skill validation**: Insert after agent validation block, before the final `issues.length` check at line 338
4. **Cross-reference validation**: Insert after skill validation block
5. **Summary update**: Modify lines 339-343

### Edge Cases

- Skills with `skill.md` (lowercase) instead of `SKILL.md` -- handle both
- `common/` directory with `README.md` -- skip or treat as utility (not a skill)
- Agent files that exist but are empty -- caught by frontmatter check
- Multi-line `description` with `>-` syntax -- handled by parser
- Legacy chain config (no chains dir) -- existing resolution logic handles this

### Testing

Run existing `vitest run` to ensure no regressions. Manual test by running MCP tool against the project itself, which has real agents and skills.

## Unresolved Questions

- Should `common/` be excluded entirely from skill validation, or reported as a warning? Recommend: exclude it since it is a shared utility directory, not a skill.
- Should we validate that `name` in frontmatter matches the filename/dirname? Recommend: no, YAGNI. Names don't strictly need to match.
