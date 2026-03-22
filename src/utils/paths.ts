import { homedir } from 'os';
import { join } from 'path';

const HOME = homedir();

// Base directories
export const CLAUDE_DIR = join(HOME, '.claude');
export const CHAINS_DIR = join(CLAUDE_DIR, 'chains');
export const BACKUP_DIR = join(CHAINS_DIR, '.backup');
export const AGENTS_DIR = join(CLAUDE_DIR, 'agents');
export const SKILLS_DIR = join(CLAUDE_DIR, 'skills');
export const HOOKS_DIR = join(CLAUDE_DIR, 'hooks', 'chains');
export const CUSTOM_HOOKS_DIR = join(HOOKS_DIR, 'custom');
export const TMP_DIR = join(CLAUDE_DIR, 'tmp');
export const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

// Config files
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
export const CHAIN_CONFIG_FILE = join(HOOKS_DIR, 'chain-config.json');
export const VERIFICATION_RULES_FILE = join(HOOKS_DIR, 'verification-rules.json');
export const HOOKS_CONFIG_FILE = join(HOOKS_DIR, 'hooks-config.yaml');
export const CHAIN_EVENTS_LOG = join(TMP_DIR, 'chain-events.jsonl');

// Per-project paths
export function encodeCwd(cwd: string): string {
  return cwd.replace(/\//g, '-');
}

export function decodeCwd(encoded: string): string {
  // First char is always '-' from leading '/'
  return encoded.replace(/-/g, '/');
}

export function getProjectDir(cwd: string): string {
  return join(PROJECTS_DIR, encodeCwd(cwd));
}

export function getProjectHooksDir(cwd: string): string {
  return join(getProjectDir(cwd), 'custom-hooks');
}

export function getProjectChainConfig(cwd: string): string {
  return join(getProjectDir(cwd), 'chain-config.yaml');
}
