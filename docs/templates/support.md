# Support Template

Customer support workflow with ticket classification and response drafting.

## Chain Flow

```
ticket-classifier → router → knowledge-searcher → response-drafter → reviewer
```

## Agents Included

- **ticket-classifier** — Classifies support tickets
- **router** — Routes to appropriate handler
- **knowledge-searcher** — Searches knowledge base
- **response-drafter** — Drafts responses
- **reviewer** — Reviews responses before sending

## Features

- **Auto-classification** — Automatic ticket categorization
- **Smart routing** — Routes to right expertise
- **Knowledge search** — Leverages existing docs
- **Quality review** — Response review before send

## Usage

```
mcp__brainbrew__template_bump(template: "support")
```

Then restart Claude Code and use:

```
"Handle support ticket"
"Draft response for customer inquiry"
```

## Flow Config

```yaml
flow:
  ticket-classifier:
    routes:
      router: "Classified"

  router:
    routes:
      knowledge-searcher: "Routed"

  knowledge-searcher:
    routes:
      response-drafter: "Knowledge found"

  response-drafter:
    routes:
      reviewer: "Response drafted"

  reviewer:
    routes:
      END: "Approved"
      response-drafter: "Needs revision"
    decide: |
      If APPROVED → "END"
      If needs REVISION → "response-drafter"
```
