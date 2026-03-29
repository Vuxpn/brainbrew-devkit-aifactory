# Marketing Template

Content marketing workflow with research, writing, and SEO optimization.

## Chain Flow

```
researcher → content-writer → editor → seo-optimizer → publisher → analyzer
```

## Agents Included

- **researcher** — Market and topic research
- **content-writer** — Drafts content
- **editor** — Edits and improves content
- **seo-optimizer** — Optimizes for search engines
- **publisher** — Publishes content
- **analyzer** — Analyzes performance

## Features

- **Research-driven** — Content backed by research
- **Quality editing** — Multi-pass editing process
- **SEO optimization** — Search engine friendly content
- **Performance tracking** — Post-publish analysis

## Usage

```
mcp__brainbrew__template_bump(template: "marketing")
```

Then restart Claude Code and use:

```
"Write a blog post about X"
"Create content for Y campaign"
```

## Flow Config

```yaml
flow:
  researcher:
    routes:
      content-writer: "Research complete"

  content-writer:
    routes:
      editor: "Draft complete"
      researcher: "Need more research"
    decide: |
      If draft COMPLETE → "editor"
      If needs MORE INFO → "researcher"

  editor:
    routes:
      seo-optimizer: "Content approved"
      content-writer: "Needs revision"
    decide: |
      If APPROVED → "seo-optimizer"
      If needs REVISION → "content-writer"

  seo-optimizer:
    routes:
      publisher: "SEO optimized"

  publisher:
    routes:
      analyzer: "Published"

  analyzer:
    routes:
      END: "Analysis complete"
```
