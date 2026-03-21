import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CHAINS_DIR, AGENTS_DIR } from '../utils/paths.js';
import { escapeRegex, escapeReplacement } from '../utils/regex.js';
import { findActiveChain } from '../utils/chain.js';

export function addCommand(flags: Record<string, string>): void {
  const name = flags.name;
  const after = flags.after;
  const chain = flags.chain || findActiveChain();

  if (!name) { console.error('Required: --name <agent-name>'); process.exit(1); }
  if (!after) { console.error('Required: --after <agent-name>'); process.exit(1); }
  if (!chain) { console.error('No active chain. Specify --chain <name>'); process.exit(1); }

  // Check agent exists
  if (!existsSync(join(AGENTS_DIR, `${name}.md`))) {
    console.error(`Agent not found: ${name}. Use "claude-chain create" to create a new agent.`);
    process.exit(1);
  }

  const file = join(CHAINS_DIR, `${chain}.yaml`);
  if (!existsSync(file)) { console.error(`Chain file not found: ${file}`); process.exit(1); }

  let content = readFileSync(file, 'utf-8');

  // Add to agents section
  const agentEntry = `  - name: ${name}\n    existing: true\n`;
  content = content.replace(/(agents:\n)/, `$1${escapeReplacement(agentEntry)}`);

  // Add to flow: insert between after and after's next
  const afterNextMatch = content.match(new RegExp(`  ${escapeRegex(after)}:\\n    next: (\\S+)`));
  if (!afterNextMatch) {
    console.error(`Agent "${after}" not found in flow section`);
    process.exit(1);
  }

  const oldNext = afterNextMatch[1];
  // Update after's next to point to new agent
  content = content.replace(
    new RegExp(`(  ${escapeRegex(after)}:\\n    next: )${escapeRegex(oldNext)}`),
    `$1${escapeReplacement(name)}`
  );
  // Add new agent's flow entry pointing to old next
  const flowEntry = `  ${name}:\n    next: ${oldNext}\n`;
  content = content.replace(/(flow:\n)/, `$1${escapeReplacement(flowEntry)}`);

  writeFileSync(file, content);
  console.log(`Added ${name} after ${after} in chain "${chain}"`);
  console.log(`  ${after} → ${name} → ${oldNext}`);
}
