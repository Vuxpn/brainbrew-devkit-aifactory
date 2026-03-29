# DevOps Template

CI/CD pipeline with security scanning, testing, and deployment.

## Chain Flow

```
code-scanner → security-auditor → test-runner → deployer → monitor
```

## Agents Included

- **code-scanner** — Scans codebase for issues
- **security-auditor** — Security vulnerability assessment
- **test-runner** — Executes test suite
- **deployer** — Handles deployments
- **monitor** — Post-deployment monitoring

## Features

- **Security-first** — Security audit before deployment
- **Test validation** — Tests must pass before deploy
- **Monitoring** — Post-deploy health checks

## Usage

```
mcp__brainbrew__template_bump(template: "devops")
```

Then restart Claude Code and use:

```
"Deploy to staging"
"Run CI pipeline"
```

## Flow Config

```yaml
flow:
  code-scanner:
    routes:
      security-auditor: "Scan complete"

  security-auditor:
    routes:
      test-runner: "No vulnerabilities"
      code-scanner: "Vulnerabilities found"
    decide: |
      If no vulnerabilities → "test-runner"
      If vulnerabilities found → "code-scanner"

  test-runner:
    routes:
      deployer: "Tests passed"
      code-scanner: "Tests failed"
    decide: |
      If tests PASSED → "deployer"
      If tests FAILED → "code-scanner"

  deployer:
    routes:
      monitor: "Deployed"

  monitor:
    routes:
      END: "Healthy"
      deployer: "Unhealthy, rollback needed"
    decide: |
      If healthy → "END"
      If unhealthy → "deployer"
```
