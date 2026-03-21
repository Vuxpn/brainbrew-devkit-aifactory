import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { CHAIN_EVENTS_LOG } from './paths.js';

export function log(file: string, msg: string): void {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(file, `${new Date().toISOString()} ${msg}\n`);
}

export function logEvent(data: Record<string, unknown>): void {
  const dir = dirname(CHAIN_EVENTS_LOG);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const entry = { ts: new Date().toISOString(), ...data };
  appendFileSync(CHAIN_EVENTS_LOG, JSON.stringify(entry) + '\n');
}
