---
name: deployment
description: Deploy applications to environments with verification.
---

# Deployment Skill

## Steps
1. Build artifacts
2. Tag release
3. Deploy to target
4. Health check
5. Rollback if needed

## Commands
```bash
npm run build
git tag -a v1.0.0 -m "Release"
kubectl apply -f k8s/
curl -f https://app/health
```
