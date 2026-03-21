import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CHAINS_DIR } from '../utils/paths.js';
import { escapeRegex, escapeReplacement } from '../utils/regex.js';
import { findActiveChain } from '../utils/chain.js';

export function createCommand(flags: Record<string, string>): void {
  const name = flags.name;
  const prompt = flags.prompt;
  const model = flags.model || 'sonnet';
  const tools = flags.tools || 'Read,Grep,Glob,Bash';
  const after = flags.after;
  const chain = flags.chain || findActiveChain();

  if (!name) { console.error('Required: --name <agent-name>'); process.exit(1); }
  if (!prompt) { console.error('Required: --prompt "agent instructions"'); process.exit(1); }
  if (!chain) { console.error('No active chain. Specify --chain <name>'); process.exit(1); }

  const file = join(CHAINS_DIR, `${chain}.yaml`);
  if (!existsSync(file)) { console.error(`Chain file not found: ${file}`); process.exit(1); }

  let content = readFileSync(file, 'utf-8');

  // Add inline agent definition
  const agentBlock = [
    `  - name: ${name}`,
    `    existing: false`,
    `    description: "${prompt.substring(0, 100)}"`,
    `    model: ${model}`,
    `    tools: [${tools}]`,
    `    skills: []`,
    `    maxTurns: 20`,
    `    prompt: |`,
    ...prompt.split('\n').map(l => `      ${l}`),
    '',
  ].join('\n');

  content = content.replace(/(agents:\n)/, `$1${escapeReplacement(agentBlock)}`);

  // Add to flow if --after specified
  if (after) {
    const afterNextMatch = content.match(new RegExp(`  ${escapeRegex(after)}:\\n    next: (\\S+)`));
    if (afterNextMatch) {
      const oldNext = afterNextMatch[1];
      content = content.replace(
        new RegExp(`(  ${escapeRegex(after)}:\\n    next: )${escapeRegex(oldNext)}`),
        `$1${escapeReplacement(name)}`
      );
      const flowEntry = `  ${name}:\n    next: ${oldNext}\n`;
      content = content.replace(/(flow:\n)/, `$1${escapeReplacement(flowEntry)}`);
      console.log(`Created ${name} and inserted after ${after}`);
      console.log(`  ${after} → ${name} → ${oldNext}`);
    }
  } else {
    // Add as terminal node
    const flowEntry = `  ${name}:\n    next: null\n`;
    content = content.replace(/(flow:\n)/, `$1${escapeReplacement(flowEntry)}`);
    console.log(`Created ${name} (terminal node — use "link" to connect it)`);
  }

  writeFileSync(file, content);
}
