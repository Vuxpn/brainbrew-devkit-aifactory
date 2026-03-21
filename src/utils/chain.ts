import { readFileSync } from 'fs';
import { CHAIN_CONFIG_FILE } from './paths.js';

export function findActiveChain(): string | null {
  try {
    const config = JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8'));
    return config.source?.replace('chains/', '').replace('.yaml', '') || null;
  } catch {
    return null;
  }
}
