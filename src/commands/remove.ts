import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CHAINS_DIR } from '../utils/paths.js';
import { loadChain } from '../core/config.js';
import { escapeRegex, escapeReplacement } from '../utils/regex.js';
import { findActiveChain } from '../utils/chain.js';

export function removeCommand(flags: Record<string, string>): void {
  const name = flags.name;
  const chainName = flags.chain || findActiveChain();

  if (!name) { console.error('Required: --name <agent-name>'); process.exit(1); }
  if (!chainName) { console.error('No active chain. Specify --chain <name>'); process.exit(1); }

  const chain = loadChain(chainName);
  if (!chain) { console.error(`Chain not found: ${chainName}`); process.exit(1); }

  // Find what points to this agent and what it points to
  const flow = chain.flow;
  if (!flow[name]) { console.error(`Agent "${name}" not found in chain flow`); process.exit(1); }

  const removedNext = flow[name].next;

  // Find agents that point to the removed agent
  const parents: string[] = [];
  for (const [agent, entry] of Object.entries(flow)) {
    if (entry.next === name) parents.push(agent);
    if (entry.on_issues === name) parents.push(`${agent}(on_issues)`);
    if (entry.on_fail === name) parents.push(`${agent}(on_fail)`);
  }

  // Rewrite YAML: remove agent, relink parents to removed agent's next
  const file = join(CHAINS_DIR, `${chainName}.yaml`);
  let content = readFileSync(file, 'utf-8');

  // Remove from flow
  const flowRegex = new RegExp(`  ${escapeRegex(name)}:\\n(    \\w+:.*\\n)*`, 'g');
  content = content.replace(flowRegex, '');

  // Relink: anything pointing to removed agent now points to removed agent's next
  const target = removedNext || 'null';
  const escapedTarget = escapeReplacement(target);
  content = content.replace(new RegExp(`next: ${escapeRegex(name)}`, 'g'), `next: ${escapedTarget}`);
  content = content.replace(new RegExp(`on_issues: ${escapeRegex(name)}`, 'g'), `on_issues: ${escapedTarget}`);
  content = content.replace(new RegExp(`on_fail: ${escapeRegex(name)}`, 'g'), `on_fail: ${escapedTarget}`);

  // Remove from agents list (rough removal)
  const agentBlockRegex = new RegExp(`  - name: ${escapeRegex(name)}\\n(    \\w+:.*\\n)*`, 'g');
  content = content.replace(agentBlockRegex, '');

  writeFileSync(file, content);
  console.log(`Removed ${name} from chain "${chainName}"`);
  if (parents.length) {
    console.log(`  Relinked: ${parents.join(', ')} → ${target}`);
  }
}
