import { loadChain, loadChainConfig } from '../core/config.js';
import { CHAIN_CONFIG_FILE } from '../utils/paths.js';
import { existsSync, readFileSync } from 'fs';

export function showCommand(chainName?: string, flags: Record<string, string> = {}): void {
  if (chainName) {
    const chain = loadChain(chainName);
    if (!chain) { console.error(`Chain not found: ${chainName}`); process.exit(1); }

    if (flags.format === 'json') {
      console.log(JSON.stringify(chain, null, 2));
      return;
    }

    printChainDiagram(chain.name, chain.flow);
    return;
  }

  // Show current active chain from chain-config.json
  if (!existsSync(CHAIN_CONFIG_FILE)) {
    console.error('No active chain. Run: claude-chain activate <chain>');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8'));

  if (flags.format === 'json') {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  const source = config.source || 'unknown';
  console.log(`Active chain: ${source}\n`);

  // Build flow from config
  const flow: Record<string, { next: string | null; on_issues?: string; on_fail?: string }> = {};
  for (const [name, agent] of Object.entries(config.agents || {})) {
    const a = agent as Record<string, unknown>;
    flow[name] = {
      next: (a.chainNext as string) || null,
      on_issues: (a.conditionalNext as Record<string, string>)?.on_issues,
      on_fail: (a.conditionalNext as Record<string, string>)?.on_fail,
    };
  }

  printChainDiagram(source, flow);
}

function printChainDiagram(
  name: string,
  flow: Record<string, { next: string | null; on_issues?: string; on_fail?: string }>
): void {
  // Find chain start (agent not targeted by any next)
  const targets = new Set<string>();
  for (const entry of Object.values(flow)) {
    if (entry.next) targets.add(entry.next);
  }
  const starts = Object.keys(flow).filter(a => !targets.has(a) || a === Object.keys(flow)[0]);
  const start = starts[0] || Object.keys(flow)[0];

  // Walk main path
  const mainPath: string[] = [];
  const visited = new Set<string>();
  let current: string | null = start;
  while (current && !visited.has(current)) {
    visited.add(current);
    mainPath.push(current);
    current = flow[current]?.next || null;
  }

  // Print main path
  console.log(mainPath.join(' → '));

  // Print conditional branches
  const conditionals: string[] = [];
  for (const [agent, entry] of Object.entries(flow)) {
    if (entry.on_issues) conditionals.push(`  ${agent} --ISSUES--> ${entry.on_issues}`);
    if (entry.on_fail) conditionals.push(`  ${agent} --FAIL--> ${entry.on_fail}`);
  }

  if (conditionals.length) {
    console.log('');
    console.log('Conditionals:');
    for (const c of conditionals) console.log(c);
  }

  console.log(`\n${Object.keys(flow).length} agents, ${mainPath.length - 1} main links`);
}
