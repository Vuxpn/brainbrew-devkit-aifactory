---
name: alert-handling
description: Handle monitoring alerts and coordinate incident response.
---

# Alert Handling Skill

## Steps
1. Receive alert
2. Assess severity
3. Correlate with other alerts
4. Determine response action
5. Execute or escalate

## Alert Levels
- **Critical**: Immediate action, potential rollback
- **High**: Urgent investigation
- **Medium**: Schedule investigation
- **Low**: Monitor

## Commands
```bash
# Check service status
kubectl get pods -n [namespace]
docker ps -a

# Check logs
kubectl logs -l app=[app] --tail=100

# Check metrics
curl -s [prometheus]/api/v1/query?query=[metric]
```

## Output
- Alert assessment
- Action taken
- Resolution or escalation status
