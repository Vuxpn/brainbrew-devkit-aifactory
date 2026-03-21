import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { CHAIN_CONFIG_FILE, CHAINS_DIR, AGENTS_DIR } from '../utils/paths.js';

export function exportCommand(flags: Record<string, string>): void {
  const name = flags.name || 'exported-chain';

  if (!existsSync(CHAIN_CONFIG_FILE)) {
    console.error('No active chain config found.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8'));
  const agents = config.agents as Record<string, any>;

  // Build YAML
  const lines: string[] = [
    `name: ${name}`,
    `description: "Exported from current chain-config.json"`,
    `version: 1`,
    '',
    'agents:',
  ];

  // Agents
  for (const agentName of Object.keys(agents)) {
    const agentFile = join(AGENTS_DIR, `${agentName}.md`);
    const exists = existsSync(agentFile);
    lines.push(`  - name: ${agentName}`);
    lines.push(`    existing: ${exists}`);
  }

  // Flow
  lines.push('');
  lines.push('flow:');
  for (const [agentName, agentConfig] of Object.entries(agents)) {
    const cfg = agentConfig as Record<string, any>;
    lines.push(`  ${agentName}:`);
    lines.push(`    next: ${cfg.chainNext || 'null'}`);
    if (cfg.conditionalNext?.on_issues) {
      lines.push(`    on_issues: ${cfg.conditionalNext.on_issues}`);
    }
    if (cfg.conditionalNext?.on_fail) {
      lines.push(`    on_fail: ${cfg.conditionalNext.on_fail}`);
    }
  }

  // Verification
  lines.push('');
  lines.push('verification:');
  for (const [agentName, agentConfig] of Object.entries(agents)) {
    const cfg = agentConfig as Record<string, any>;
    if (cfg.verification) {
      lines.push(`  ${agentName}:`);
      if (cfg.verification.minLength) lines.push(`    minLength: ${cfg.verification.minLength}`);
      if (cfg.verification.required?.length) {
        lines.push(`    requiredAny: [${cfg.verification.required.map((r: string) => `"${r}"`).join(', ')}]`);
      }
    }
  }

  const yaml = lines.join('\n') + '\n';

  if (!existsSync(CHAINS_DIR)) mkdirSync(CHAINS_DIR, { recursive: true });
  const outFile = join(CHAINS_DIR, `${name}.yaml`);
  writeFileSync(outFile, yaml);
  console.log(`Exported to ${outFile}`);
}
