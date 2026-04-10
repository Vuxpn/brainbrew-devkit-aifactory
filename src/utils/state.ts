import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { TMP_DIR } from './paths.js';

const STATE_DIR = join(TMP_DIR, 'chain-state');

interface ChainState {
  previousAgents: Array<{ type: string; outputSummary?: string; outputPath?: string }>;
  currentAgent?: string;
  sharedContext?: Record<string, unknown>;
  phaseTracking?: {
    totalPhases: number;
    completedPhases: number;
    phases: string[];
  };
  activeTeam?: {
    name: string;
    teammates: Array<{ name: string; agent: string; status: 'pending' | 'running' | 'complete' }>;
    startedAt: string;
  };
  chainBlockCount?: number;
}

function statePath(sessionId: string): string {
  return join(STATE_DIR, `${sessionId}.json`);
}

export function getState(sessionId: string): ChainState | null {
  if (!sessionId) return null;
  const file = statePath(sessionId);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

export function updateState(sessionId: string, updates: Partial<ChainState>): void {
  if (!sessionId) return;
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  const current = getState(sessionId) || { previousAgents: [] };
  const merged = { ...current, ...updates };
  writeFileSync(statePath(sessionId), JSON.stringify(merged, null, 2));
}

export function clearState(sessionId: string): void {
  const file = statePath(sessionId);
  if (existsSync(file)) unlinkSync(file);
}
