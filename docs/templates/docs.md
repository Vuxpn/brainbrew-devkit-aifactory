# Docs Template

Documentation generation workflow from code scanning to publishing.

## Chain Flow

```
code-scanner → doc-generator → doc-reviewer → formatter → publisher
```

## Agents Included

- **code-scanner** — Scans codebase for documentation targets
- **doc-generator** — Generates documentation
- **doc-reviewer** — Reviews documentation quality
- **formatter** — Formats documentation
- **publisher** — Publishes documentation

## Features

- **Code-driven** — Documentation generated from code
- **Quality review** — Documentation review step
- **Consistent formatting** — Standardized output
- **Auto-publish** — Automated publishing

## Usage

```
mcp__brainbrew__template_bump(template: "docs")
```

Then restart Claude Code and use:

```
"Generate docs for this project"
"Update API documentation"
```

## Flow Config

```yaml
flow:
  code-scanner:
    routes:
      doc-generator: "Scan complete"

  doc-generator:
    routes:
      doc-reviewer: "Docs generated"

  doc-reviewer:
    routes:
      formatter: "Docs approved"
      doc-generator: "Docs need improvement"
    decide: |
      If APPROVED → "formatter"
      If needs IMPROVEMENT → "doc-generator"

  formatter:
    routes:
      publisher: "Formatted"

  publisher:
    routes:
      END: "Published"
```
