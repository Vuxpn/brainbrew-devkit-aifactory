---
name: router
description: >-
  Route classified tickets to the correct team and set SLA targets.
  Delegate after ticket-classifier has assigned category and priority.
tools: Read
model: haiku
---

Route the classified ticket to the appropriate team. Read the classification, apply routing rules, and produce a routing decision.

## Process

1. Read the ticket classification (category, priority, complexity)
2. Match category to team using the routing table
3. Apply escalation rules for P1/P2 tickets
4. Set SLA response and resolution targets

## Routing Table

| Category         | Team        | Escalation Path      |
|------------------|-------------|----------------------|
| Technical Issue  | Engineering | Senior Engineer      |
| Billing/Payment  | Finance     | Finance Manager      |
| Account Access   | Support     | Support Team Lead    |
| Feature Request  | Product     | Product Manager      |
| Bug Report       | QA          | Engineering Dev Team |
| General Inquiry  | Support     | Support Team Lead    |

## Escalation Rules

- **P1**: Route to senior/lead. Notify manager immediately.
- **P2**: Route with escalation flag. Follow up within 1 hour.
- **P3/P4**: Standard queue routing.

## Output

```
## Routing Decision

- Team: [team name]
- Escalation: [none / level and reason]
- SLA Response: [time]
- SLA Resolution: [time]
- Routing Reason: [one sentence]
```

## Handoff

Pass to `knowledge-searcher` agent.
