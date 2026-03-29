# skill-improver

Iteratively reviews and fixes Claude Code skill quality issues until they meet standards.

## Triggers

- "fix my skill"
- "improve skill quality"
- "skill improvement loop"
- "iteratively refine a skill"

## When to Use

- Improving a skill with multiple quality issues
- Iterating on a new skill until it meets standards
- Automated fix-review cycles instead of manual editing
- Consistent quality enforcement across skills

## When NOT to Use

- **One-time review**: Use `/skill-reviewer` directly instead
- **Quick single fixes**: Edit the file directly
- **Non-skill files**: Only works on SKILL.md files
- **Experimental skills**: Manual iteration gives more control during exploration

## Core Loop

1. **Review** - Call skill-reviewer on the target skill
2. **Categorize** - Parse issues by severity
3. **Fix** - Address critical and major issues
4. **Evaluate** - Check minor issues for validity before fixing
5. **Repeat** - Continue until quality bar is met

## Issue Categorization

### Critical Issues (MUST fix immediately)

These block skill loading or cause runtime failures:

- Missing required frontmatter fields (name, description)
- Invalid YAML frontmatter syntax
- Referenced files that don't exist
- Broken file paths
- Invalid `allowed-tools` values
- Invalid `model` value
- Invalid `effort` value
- Invalid `context` value
- `agent` field set without `context: fork`

### Major Issues (MUST fix)

These significantly degrade skill effectiveness:

- Weak or vague trigger descriptions
- Wrong writing voice (second person "you" instead of imperative)
- SKILL.md exceeds 500 lines without using references/
- Missing "When to Use" or "When NOT to Use" sections
- Description doesn't specify when to trigger
- Missing `allowed-tools`
- `argument-hint` set but `$ARGUMENTS` not used in body
- Referenced supporting files don't exist
- Non-standard frontmatter fields

### Minor Issues (Evaluate before fixing)

These are polish items that may or may not improve the skill:

- Subjective style preferences
- Optional enhancements
- "Nice to have" improvements
- Formatting suggestions

## Frontmatter Validation Checklist

| Field | Valid Values | Notes |
|---|---|---|
| `name` | lowercase, numbers, hyphens (max 64) | Uses dir name if omitted |
| `description` | string | Should include trigger phrases |
| `allowed-tools` | Claude Code tool names | Comma-separated or YAML list |
| `argument-hint` | string | Shown in autocomplete |
| `disable-model-invocation` | `true`/`false` | Prevents Claude auto-trigger |
| `user-invocable` | `true`/`false` | Hides from `/` menu |
| `context` | `fork` | Runs in isolated subagent |
| `agent` | `Explore`, `Plan`, `general-purpose`, or custom | Requires `context: fork` |
| `model` | `sonnet`, `opus`, `haiku`, full model ID | Override model |
| `effort` | `low`, `medium`, `high`, `max` | Override effort |
| `hooks` | Hook config object | Lifecycle hooks |

## Completion Criteria

The improvement loop completes when:

1. skill-reviewer reports "Pass" or no issues found
2. All critical and major issues are fixed and verified
3. Remaining issues are only minor and evaluated as false positives
