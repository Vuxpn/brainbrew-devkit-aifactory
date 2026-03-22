---
name: rollback
description: Rollback deployments when failures or critical issues are detected.
---

# Rollback Skill

## Steps
1. Identify failure
2. Stop current deployment
3. Rollback to previous version
4. Verify health
5. Document incident

## Commands
```bash
# Kubernetes
kubectl rollout undo deployment/[app]
kubectl rollout status deployment/[app]

# Docker
docker service update --rollback [service]

# Vercel/Cloud
vercel rollback [deployment-id]
```

## Output
- Rollback status
- Health check results
- Incident summary
