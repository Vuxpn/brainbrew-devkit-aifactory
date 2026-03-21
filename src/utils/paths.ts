import { homedir } from 'os';
import { join } from 'path';

const HOME = homedir();

export const CLAUDE_DIR = join(HOME, '.claude');
export const CHAINS_DIR = join(CLAUDE_DIR, 'chains');
export const BACKUP_DIR = join(CHAINS_DIR, '.backup');
export const AGENTS_DIR = join(CLAUDE_DIR, 'agents');
export const SKILLS_DIR = join(CLAUDE_DIR, 'skills');
export const HOOKS_DIR = join(CLAUDE_DIR, 'hooks', 'chains');
export const TMP_DIR = join(CLAUDE_DIR, 'tmp');
export const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
export const CHAIN_CONFIG_FILE = join(HOOKS_DIR, 'chain-config.json');
export const VERIFICATION_RULES_FILE = join(HOOKS_DIR, 'verification-rules.json');
export const CHAIN_EVENTS_LOG = join(TMP_DIR, 'chain-events.jsonl');
