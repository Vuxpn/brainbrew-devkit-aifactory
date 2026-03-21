# Agent Audit Checklist

## Critical (must fix)

- [ ] `name` field exists, lowercase letters and hyphens only
- [ ] `description` field exists and explains WHEN Claude should delegate
- [ ] File is valid markdown with `---` YAML frontmatter delimiters
- [ ] No XML angle brackets in frontmatter

## Major (should fix)

- [ ] `tools` field scopes capabilities — not left open (inherits ALL if omitted)
- [ ] `model` field set appropriately (sonnet for focused tasks, opus for complex reasoning, haiku for fast/cheap)
- [ ] Description is concise — no multi-paragraph examples or JSON-escaped strings
- [ ] System prompt is focused — under 100 lines, no listing capabilities Claude already has
- [ ] No references to non-existent skills or tools
- [ ] `disallowedTools` used when agent needs most tools but should skip a few
- [ ] `skills` field MUST exist — every agent must have at least one skill that defines its domain expertise
- [ ] Each skill in `skills:` list must exist in `.claude/skills/` (project root, NOT global `~/.claude/skills/`)
- [ ] Skills must be relevant to the agent's purpose — not random or mismatched

## Skills Audit (required sub-step)

When an agent has `skills:`, also audit each referenced skill:
- [ ] Skill folder and SKILL.md exist in `.claude/skills/`
- [ ] Skill frontmatter is valid (name, description)
- [ ] Skill content is under 100 lines (detail in references/)
- [ ] Skill references/ files exist if referenced in SKILL.md
- [ ] If skill quality is poor, improve it using `improve-skill` checklist

When an agent is MISSING `skills:`:
- [ ] Identify 1-3 skills from `.claude/skills/` (project root) that match the agent's purpose
- [ ] If no matching skill exists, flag as "needs new skill" and create one in `.claude/skills/`
- [ ] Add `skills:` field to agent frontmatter

## Minor (nice to fix)

- [ ] `color` field set for UI identification
- [ ] `maxTurns` set to prevent runaway agents
- [ ] `memory` field enabled for agents that build knowledge over time
- [ ] Prompt uses imperative form, not second person
- [ ] No "IMPORTANT" markers everywhere (dilutes actual importance)
- [ ] No verbose "Core Competencies" or "Your Expertise" sections

## Verdict

| Verdict | Criteria |
|---------|----------|
| **PASS** | No critical, ≤2 minor |
| **NEEDS FIX** | Has critical or ≥3 major |
| **REWRITE** | Fundamentally broken |
