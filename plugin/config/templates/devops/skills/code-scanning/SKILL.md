---
name: code-scanning
description: Scan code for issues, patterns, and dependencies.
---

# Code Scanning Skill

## Checks
- Changed files analysis
- Dependency audit
- Pattern detection
- Complexity metrics
- Large file detection
- Secret scanning

## Commands
```bash
git diff --name-only HEAD~1
npm audit / pip check
grep -r "password\|secret" --include="*.{js,ts,py}"
```
