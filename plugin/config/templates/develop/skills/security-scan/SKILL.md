---
name: security-scan
description: Scan code for security vulnerabilities during development.
---

# Security Scan Skill

## Checks
1. Injection vulnerabilities (SQL, XSS, command)
2. Hardcoded secrets
3. Vulnerable dependencies
4. OWASP Top 10

## Commands
```bash
# Dependency audit
npm audit
pip-audit

# Secret detection
grep -rn "password\s*=\|api_key\s*=" --include="*.{js,ts,py}"

# Injection patterns
grep -rn "innerHTML\|dangerouslySetInnerHTML" --include="*.{js,tsx}"
grep -rn "exec\|spawn\|system" --include="*.{js,ts,py}"
```

## Output
- Severity summary (Critical/High/Medium/Low)
- Findings with locations
- Recommended fixes
- PASS/FIX_REQUIRED verdict
