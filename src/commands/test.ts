import { loadChain } from '../core/config.js';
import { validateChain, formatValidation } from '../core/validator.js';

export function testCommand(chainName?: string, flags: Record<string, string> = {}): void {
  const name = chainName || 'dev-chain';
  const chain = loadChain(name);
  if (!chain) {
    console.error(`Chain not found: ${name}`);
    process.exit(1);
  }

  const result = validateChain(chain);

  if (flags.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatValidation(chain, result));
  }

  process.exit(result.pass ? 0 : 1);
}
