# Skills Reference

Skills are Claude Code plugins that provide specialized capabilities.

## Plugin Skills

These skills ship with brainbrew-devkit:

| Skill | Description |
|-------|-------------|
| [chain-builder](/skills/chain-builder) | Set up workflow templates and manage chain flows |
| [memory](/skills/memory) | Inter-agent communication via Memory Bus |
| [skill-creator](/skills/skill-creator) | Create and manage skills |
| [skill-improver](/skills/skill-improver) | Iteratively review and fix skill quality |
| [skill-finder](/skills/skill-finder) | Search and install skills from multiple sources |
| [agent-improver](/skills/agent-improver) | Create and improve agents |

## Skill Anatomy

Each skill is a directory with a `SKILL.md` file:

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── references/        # Supporting documentation
├── examples/          # Example outputs
└── scripts/           # Helper scripts
```

## Creating Custom Skills

See the [Custom Skills](/guide/custom-skills) guide for details on creating your own skills.
