#!/usr/bin/env node
const { readFileSync } = require('fs');

const DANGEROUS_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|--force\s+).*\//i, label: 'rm -rf on directory' },
  { pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+[~\/]/i, label: 'recursive delete from root/home' },
  { pattern: /\bgit\s+push\s+.*--force\b/i, label: 'git push --force' },
  { pattern: /\bgit\s+push\s+-f\b/i, label: 'git push -f' },
  { pattern: /\bgit\s+reset\s+--hard\b/i, label: 'git reset --hard' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/i, label: 'git clean -f' },
  { pattern: /\bgit\s+checkout\s+\.\s*$/i, label: 'git checkout .' },
  { pattern: /\bgit\s+branch\s+-D\b/i, label: 'git branch -D' },
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, label: 'SQL DROP' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, label: 'SQL TRUNCATE' },
  { pattern: /\b(chmod|chown)\s+.*-R\s+[\/~]/i, label: 'recursive permission change' },
  { pattern: /\bkill\s+-9\b/i, label: 'kill -9' },
  { pattern: /\bmkfs\b/i, label: 'mkfs (format disk)' },
  { pattern: /\bdd\s+if=.*of=\/dev\//i, label: 'dd to device' },
  { pattern: />\s*\/dev\/sd[a-z]/i, label: 'write to block device' },
  { pattern: /\bcurl\b.*\|\s*(bash|sh|zsh)\b/i, label: 'curl pipe to shell' },
  { pattern: /\bwget\b.*\|\s*(bash|sh|zsh)\b/i, label: 'wget pipe to shell' },
  { pattern: /\bkubectl\s+delete\s+(namespace|ns)\b/i, label: 'kubectl delete namespace' },
  { pattern: /\bkubectl\s+delete\s+.*--all\b/i, label: 'kubectl delete --all' },
  { pattern: /\bkubectl\s+delete\s+.*-A\b/i, label: 'kubectl delete across all namespaces' },
  { pattern: /\bkubectl\s+drain\b/i, label: 'kubectl drain node' },
  { pattern: /\bkubectl\s+cordon\b/i, label: 'kubectl cordon node' },
  { pattern: /\bkubectl\s+taint\b/i, label: 'kubectl taint node' },
  { pattern: /\bkubectl\s+replace\s+--force\b/i, label: 'kubectl replace --force' },
  { pattern: /\bkubectl\s+exec\s+.*--\s*(rm|dd|mkfs|shutdown|reboot)\b/i, label: 'kubectl exec dangerous command' },
  { pattern: /\bkubectl\s+apply\s+.*-f\s+https?:/i, label: 'kubectl apply from remote URL' },
  { pattern: /\bkubectl\s+scale\s+.*--replicas=0\b/i, label: 'kubectl scale to 0 replicas' },
  { pattern: /\bkubectl\s+edit\s+(clusterrole|clusterrolebinding)\b/i, label: 'kubectl edit cluster RBAC' },
  { pattern: /\bhelm\s+(uninstall|delete)\b/i, label: 'helm uninstall release' },
  { pattern: /\bhelm\s+rollback\b/i, label: 'helm rollback' },
];

let stdin = '';
try {
  stdin = readFileSync(0, 'utf-8').trim();
} catch {
  process.exit(0);
}
if (!stdin) process.exit(0);

let payload;
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

if (payload.tool_name !== 'Bash') process.exit(0);

const command = payload.tool_input?.command;
if (!command) process.exit(0);

for (const { pattern, label } of DANGEROUS_PATTERNS) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Blocked dangerous command: ${label}\nCommand: ${command}\n\nIf you need to run this, ask the user for explicit confirmation first.`,
    }));
    process.exit(0);
  }
}
