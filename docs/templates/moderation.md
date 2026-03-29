# Moderation Template

Content moderation workflow with scanning, classification, and action.

## Chain Flow

```
content-scanner → classifier → flagger → reviewer → actioner
```

## Agents Included

- **content-scanner** — Scans content for issues
- **classifier** — Classifies content type/severity
- **flagger** — Flags problematic content
- **reviewer** — Human-in-the-loop review
- **actioner** — Takes appropriate action

## Features

- **Content scanning** — Automatic content analysis
- **Classification** — Severity categorization
- **Flagging** — Highlight problematic items
- **Action automation** — Automated responses

## Usage

```
mcp__brainbrew__template_bump(template: "moderation")
```

Then restart Claude Code and use:

```
"Review content for moderation"
"Moderate user submissions"
```

## Flow Config

```yaml
flow:
  content-scanner:
    routes:
      classifier: "Scan complete"

  classifier:
    routes:
      flagger: "Classified"

  flagger:
    routes:
      reviewer: "Flagged for review"
      actioner: "Auto-action possible"
    decide: |
      If needs REVIEW → "reviewer"
      If AUTO-ACTION possible → "actioner"

  reviewer:
    routes:
      actioner: "Review complete"

  actioner:
    routes:
      END: "Action taken"
```
