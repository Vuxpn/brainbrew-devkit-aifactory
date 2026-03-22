---
name: compliance-review
description: Review code and infrastructure for regulatory compliance.
---

# Compliance Review Skill

## Frameworks
- **GDPR/CCPA**: Data privacy
- **SOC2/ISO27001**: Security controls
- **HIPAA**: Healthcare data
- **PCI-DSS**: Payment data

## Checks
1. PII handling and encryption
2. Access controls and RBAC
3. Audit logging
4. Data retention policies
5. Secret management

## Commands
```bash
# Check for PII patterns
grep -r "ssn\|credit.card" --include="*.{js,ts,py}"

# Verify encryption usage
grep -r "AES\|encrypt" --include="*.{js,ts,py}"

# Check env vars (no hardcoded secrets)
grep -r "process\.env" --include="*.{js,ts,py}"
```

## Output
- Compliance status per framework
- Findings with severity
- Required remediations
