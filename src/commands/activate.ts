import { loadChain } from '../core/config.js';
import { validateChain, formatValidation } from '../core/validator.js';
import { generate, formatResult } from '../core/generator.js';

export function activateCommand(chainName?: string, _flags: Record<string, string> = {}): void {
  if (!chainName) {
    console.error('Usage: claude-chain activate <chain-name>');
    process.exit(1);
  }

  const chain = loadChain(chainName);
  if (!chain) {
    console.error(`Chain not found: ${chainName}`);
    process.exit(1);
  }

  // Validate first
  const validation = validateChain(chain);
  console.log(formatValidation(chain, validation));

  if (!validation.pass) {
    console.error('\nChain validation failed. Fix issues before activating.');
    process.exit(1);
  }

  // Generate
  console.log('\nGenerating...');
  const result = generate(chain);
  console.log(formatResult(result));
  console.log(`\nChain "${chainName}" activated.`);
}
