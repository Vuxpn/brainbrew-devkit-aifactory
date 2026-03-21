import { listChains, loadChain } from '../core/config.js';

export function listCommand(): void {
  const chains = listChains();
  if (!chains.length) {
    console.log('No chains found in ~/.claude/chains/');
    return;
  }

  console.log('Available chains:\n');
  for (const name of chains) {
    const chain = loadChain(name);
    const agents = chain ? Object.keys(chain.flow).length : '?';
    const desc = chain?.description || '';
    console.log(`  ${name} (${agents} agents) — ${desc}`);
  }
}
