# Review Template

Simple code review workflow with a single agent.

## Chain Flow

```
code-reviewer → END
```

## Agents Included

- **code-reviewer** — Reviews code for quality, bugs, and improvements

## Features

- **Single-step** — Quick code review without full pipeline
- **Focused** — Just review, no implementation

## Usage

```
mcp__brainbrew__template_bump(template: "review")
```

Then restart Claude Code and use:

```
"Review this code"
"Check for bugs in this file"
```

## Flow Config

```yaml
flow:
  code-reviewer:
    routes:
      END: "Review complete"
```

## When to Use

Use the `review` template when:

- You only need code review functionality
- You don't want the full develop pipeline
- You want quick, focused reviews
