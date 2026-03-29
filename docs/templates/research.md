# Research Template

Research workflow for gathering, analyzing, and synthesizing information.

## Chain Flow

```
topic-researcher → source-gatherer → analyzer → synthesizer → report-writer
```

## Agents Included

- **topic-researcher** — Explores research topics
- **source-gatherer** — Collects sources and data
- **analyzer** — Analyzes collected information
- **synthesizer** — Synthesizes findings
- **report-writer** — Produces final report

## Features

- **Structured research** — Systematic approach to research
- **Source collection** — Comprehensive source gathering
- **Analysis pipeline** — Multi-stage analysis
- **Report generation** — Polished final output

## Usage

```
mcp__brainbrew__template_bump(template: "research")
```

Then restart Claude Code and use:

```
"Research topic X"
"Analyze Y and produce a report"
```

## Flow Config

```yaml
flow:
  topic-researcher:
    routes:
      source-gatherer: "Topic defined"

  source-gatherer:
    routes:
      analyzer: "Sources collected"
      topic-researcher: "Need to refine topic"
    decide: |
      If sources COLLECTED → "analyzer"
      If need REFINEMENT → "topic-researcher"

  analyzer:
    routes:
      synthesizer: "Analysis complete"

  synthesizer:
    routes:
      report-writer: "Synthesis complete"

  report-writer:
    routes:
      END: "Report complete"
```
