import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { SETTINGS_FILE } from '../utils/paths.js';

const CHAIN_HOME = join(homedir(), '.claude-chain');
const HOOKS_DIR = join(CHAIN_HOME, 'hooks');
const CUSTOM_DIR = join(HOOKS_DIR, 'custom');
const CONFIG_FILE = join(CHAIN_HOME, 'config.yaml');

// Resolve dist/hooks/ from this CLI's package location
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_HOOKS = join(__dirname, 'hooks');

const BUILT_IN_HOOKS = [
  { src: 'post-agent.cjs', dest: 'post-agent.js', event: 'PostToolUse' },
  { src: 'subagent-start.cjs', dest: 'subagent-start.js', event: 'SubagentStart' },
  { src: 'subagent-stop.cjs', dest: 'subagent-stop.js', event: 'SubagentStop' },
  { src: 'runner.cjs', dest: 'runner.js', event: null },
];

export function initCommand(flags: Record<string, string>): void {
  console.log('Initializing claude-chain...\n');

  // 1. Create directories
  for (const dir of [CHAIN_HOME, HOOKS_DIR, CUSTOM_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`  Created: ${dir}`);
    }
  }

  // 2. Copy compiled hooks from this CLI package → ~/.claude-chain/hooks/
  let installed = 0;
  for (const hook of BUILT_IN_HOOKS) {
    const src = join(DIST_HOOKS, hook.src);
    const dest = join(HOOKS_DIR, hook.dest);

    if (existsSync(src)) {
      copyFileSync(src, dest);
      installed++;
      console.log(`  Installed: hooks/${hook.dest}`);
    } else {
      console.log(`  Warning: ${hook.src} not found in package — skipping`);
    }
  }
  console.log(`  ${installed}/${BUILT_IN_HOOKS.length} hooks installed`);

  // 3. Generate config.yaml (preserve existing custom hooks)
  const existingCustom = existsSync(CONFIG_FILE)
    ? parseExistingCustomHooks(readFileSync(CONFIG_FILE, 'utf-8'))
    : {};

  const config = generateConfig(existingCustom);
  writeFileSync(CONFIG_FILE, config);
  console.log(`  Written: config.yaml`);

  // 4. Update ~/.claude/settings.json
  if (flags['skip-settings'] !== 'true') {
    updateSettings();
  }

  console.log('\nDone. Hooks are ready.');
  console.log('\nAll 22 Claude Code events supported.');
  console.log('Add custom hooks: claude-chain hook scaffold --name <name> --event <event>');
}

function generateConfig(existingCustom: Record<string, string[]>): string {
  const lines = ['hooks:'];

  // Built-in events with default hooks
  const defaults: Record<string, string> = {
    PostToolUse: 'hooks/post-agent.js',
    SubagentStart: 'hooks/subagent-start.js',
    SubagentStop: 'hooks/subagent-stop.js',
    Stop: 'hooks/error-logger.js',
  };

  for (const [event, hookFile] of Object.entries(defaults)) {
    lines.push(`  ${event}:`);
    lines.push(`    - ${hookFile}`);
    // Append custom hooks for this event
    if (existingCustom[event]) {
      for (const custom of existingCustom[event]) {
        lines.push(`    - ${custom}`);
      }
    }
  }

  // Events that only have custom hooks (no built-in)
  for (const [event, customs] of Object.entries(existingCustom)) {
    if (defaults[event]) continue; // already handled
    lines.push(`  ${event}:`);
    for (const custom of customs) {
      lines.push(`    - ${custom}`);
    }
  }

  return lines.join('\n') + '\n';
}

function parseExistingCustomHooks(content: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let currentEvent = '';

  for (const line of content.split('\n')) {
    const eventMatch = line.match(/^\s{2}(\S+):$/);
    if (eventMatch) {
      currentEvent = eventMatch[1];
      continue;
    }
    const itemMatch = line.match(/^\s{4}-\s+(.+)/);
    if (itemMatch && currentEvent) {
      const hook = itemMatch[1];
      // Only keep custom hooks — built-in will be re-added
      if (hook.includes('custom/')) {
        if (!result[currentEvent]) result[currentEvent] = [];
        result[currentEvent].push(hook);
      }
    }
  }
  return result;
}

function updateSettings(): void {
  if (!existsSync(SETTINGS_FILE)) {
    console.log('\n  Warning: ~/.claude/settings.json not found. Skipping.');
    return;
  }

  const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
  const runnerPath = join(HOOKS_DIR, 'runner.js');

  // Remove old hooks (ours or legacy)
  const isOurHook = (h: any) =>
    h?.hooks?.[0]?.command?.includes('hooks/chains/') ||
    h?.hooks?.[0]?.command?.includes('claude-chain') ||
    h?.hooks?.[0]?.command?.includes('.claude-chain');

  const cleanHooks = (arr: unknown[]) =>
    (arr || []).filter((h: any) => !isOurHook(h));

  settings.hooks = settings.hooks || {};

  // Read config.yaml to know which events have hooks
  const configContent = existsSync(CONFIG_FILE) ? readFileSync(CONFIG_FILE, 'utf-8') : '';
  const events = [...configContent.matchAll(/^\s{2}(\S+):$/gm)].map(m => m[1]);

  for (const event of events) {
    const existing = cleanHooks(settings.hooks[event] || []);
    const matcher = event === 'PostToolUse' ? 'Agent' : '.*';

    existing.push({
      matcher,
      hooks: [{ type: 'command', command: `node ${runnerPath} ${event}` }],
    });

    settings.hooks[event] = existing;
  }

  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  console.log(`  Updated: ~/.claude/settings.json (${events.length} events)`);
}
