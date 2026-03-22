---
name: code-fixing
description: Fix code issues identified by scanners and security audits.
---

# Code Fixing Skill

## Steps
1. Review identified issues
2. Apply automated fixes
3. Manual fixes for complex issues
4. Run linting/formatting
5. Verify fixes

## Commands
```bash
# Auto-fix linting
npm run lint -- --fix
black .
go fmt ./...

# Fix vulnerabilities
npm audit fix
pip install --upgrade [package]

# Verify
npm run test
npm run lint
```

## Output
- List of fixes applied
- Manual fixes required
- Verification status
