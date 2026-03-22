---
name: performance-analysis
description: Analyze application performance and identify optimization opportunities.
---

# Performance Analysis Skill

## Steps
1. Collect metrics
2. Compare against baselines
3. Identify bottlenecks
4. Generate recommendations
5. Prioritize fixes

## Metrics
- Response times (P50, P95, P99)
- Memory usage
- CPU utilization
- Bundle size
- Database query times

## Commands
```bash
# Check bundle size
du -sh dist/
npm run analyze

# Measure response time
curl -w "@curl-format.txt" -s -o /dev/null [url]

# Profile
node --inspect app.js
```

## Output
- Metrics vs baseline
- Bottleneck list
- Optimization recommendations
