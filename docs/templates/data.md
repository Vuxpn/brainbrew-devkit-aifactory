# Data Template

Data processing workflow from collection to reporting.

## Chain Flow

```
data-collector → cleaner → analyzer → visualizer → reporter
```

## Agents Included

- **data-collector** — Collects data from sources
- **cleaner** — Cleans and normalizes data
- **analyzer** — Analyzes data patterns
- **visualizer** — Creates visualizations
- **reporter** — Generates reports

## Features

- **Data pipeline** — End-to-end data processing
- **Data cleaning** — Automatic data normalization
- **Analysis** — Pattern detection and insights
- **Visualization** — Chart and graph generation

## Usage

```
mcp__brainbrew__template_bump(template: "data")
```

Then restart Claude Code and use:

```
"Analyze this dataset"
"Generate data report"
```

## Flow Config

```yaml
flow:
  data-collector:
    routes:
      cleaner: "Data collected"

  cleaner:
    routes:
      analyzer: "Data cleaned"

  analyzer:
    routes:
      visualizer: "Analysis complete"

  visualizer:
    routes:
      reporter: "Visualizations ready"

  reporter:
    routes:
      END: "Report complete"
```
