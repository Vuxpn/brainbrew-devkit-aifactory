import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { HOOKS_DIR, CUSTOM_HOOKS_DIR, HOOKS_CONFIG_FILE } from '../../utils/paths.js';
import type { HookConfig } from './hook-constants.js';
import { parseSimpleYaml } from './hook-utils.js';

export function loadGlobalConfig(): HookConfig {
  if (!existsSync(HOOKS_CONFIG_FILE)) {
    return { hooks: {} };
  }
  return parseSimpleYaml(readFileSync(HOOKS_CONFIG_FILE, 'utf-8'));
}

export function saveGlobalConfig(config: HookConfig): void {
  const lines = ['hooks:'];
  for (const [event, hooks] of Object.entries(config.hooks)) {
    if (hooks.length === 0) continue;
    lines.push(`  ${event}:`);
    for (const hook of hooks) {
      lines.push(`    - ${hook}`);
    }
  }
  if (!existsSync(HOOKS_DIR)) mkdirSync(HOOKS_DIR, { recursive: true });
  writeFileSync(HOOKS_CONFIG_FILE, lines.join('\n') + '\n');
}

export function findGlobalHookPath(name: string): string | null {
  if (existsSync(join(HOOKS_DIR, `${name}.js`))) return `${name}.js`;
  if (existsSync(join(CUSTOM_HOOKS_DIR, `${name}.js`))) return `custom/${name}.js`;
  return null;
}
