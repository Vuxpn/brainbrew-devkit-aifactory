import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '';
const CHAIN_HOME = join(HOME, '.claude-chain');
const HOOKS_DIR = join(CHAIN_HOME, 'hooks');
const CUSTOM_DIR = join(HOOKS_DIR, 'custom');
const CONFIG_FILE = join(CHAIN_HOME, 'config.yaml');

const HOOK_EVENTS = [
  'SessionStart', 'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest',
  'SubagentStart', 'SubagentStop',
  'Stop', 'StopFailure',
  'PreCompact', 'PostCompact',
  'Notification',
  'TeammateIdle', 'TaskCompleted',
  'ConfigChange', 'InstructionsLoaded',
  'WorktreeCreate', 'WorktreeRemove',
  'Elicitation', 'ElicitationResult',
] as const;
type HookEvent = typeof HOOK_EVENTS[number];

interface HookConfig {
  hooks: Record<string, string[]>;
}

function loadConfig(): HookConfig {
  if (!existsSync(CONFIG_FILE)) {
    return { hooks: {} };
  }
  return parseSimpleYaml(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config: HookConfig): void {
  const lines = ['hooks:'];
  for (const [event, hooks] of Object.entries(config.hooks)) {
    lines.push(`  ${event}:`);
    for (const hook of hooks) {
      lines.push(`    - ${hook}`);
    }
  }
  writeFileSync(CONFIG_FILE, lines.join('\n') + '\n');
}

function parseSimpleYaml(content: string): HookConfig {
  const config: HookConfig = { hooks: {} };
  let currentEvent = '';

  for (const line of content.split('\n')) {
    const eventMatch = line.match(/^\s{2}(\w+):$/);
    if (eventMatch) {
      currentEvent = eventMatch[1];
      config.hooks[currentEvent] = [];
      continue;
    }
    const itemMatch = line.match(/^\s{4}-\s+(.+)/);
    if (itemMatch && currentEvent) {
      config.hooks[currentEvent].push(itemMatch[1]);
    }
  }
  return config;
}

export function hookCommand(args: string[], flags: Record<string, string>): void {
  const sub = args[0];

  switch (sub) {
    case 'list': return hookList();
    case 'add': return hookAdd(flags);
    case 'enable': return hookEnable(flags);
    case 'disable': return hookDisable(flags);
    case 'scaffold': return hookScaffold(flags);
    default:
      console.log(`Usage: claude-chain hook <list|add|scaffold|enable|disable> [options]

Commands:
  list                             List all hooks and their status
  scaffold --name X --event E      Create a new hook template
  add --file path --event E        Register an existing hook file
  enable --name X --event E        Enable a disabled hook
  disable --name X --event E       Disable a hook without removing`);
  }
}

function hookList(): void {
  const config = loadConfig();

  if (Object.keys(config.hooks).length === 0) {
    console.log('No hooks configured. Run: claude-chain init');
    return;
  }

  console.log('Active hooks:\n');
  for (const [event, hooks] of Object.entries(config.hooks)) {
    console.log(`  ${event}:`);
    for (const hook of hooks) {
      const fullPath = join(CHAIN_HOME, hook);
      const exists = existsSync(fullPath);
      const icon = exists ? '  ✓' : '  ✗';
      const custom = hook.includes('custom/') ? ' (custom)' : ' (built-in)';
      console.log(`  ${icon} ${hook}${custom}${exists ? '' : ' [MISSING]'}`);
    }
  }
}

function hookScaffold(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name) { console.error('Required: --name <hook-name>'); process.exit(1); }
  if (!event || !HOOK_EVENTS.includes(event as HookEvent)) {
    console.error(`Required: --event <${HOOK_EVENTS.join('|')}>`);
    process.exit(1);
  }

  if (!existsSync(CUSTOM_DIR)) mkdirSync(CUSTOM_DIR, { recursive: true });

  const hookFile = join(CUSTOM_DIR, `${name}.js`);
  if (existsSync(hookFile)) {
    console.error(`Hook already exists: ${hookFile}`);
    process.exit(1);
  }

  const template = generateHookTemplate(name, event);
  writeFileSync(hookFile, template);

  // Register in config
  const config = loadConfig();
  if (!config.hooks[event]) config.hooks[event] = [];
  config.hooks[event].push(`hooks/custom/${name}.js`);
  saveConfig(config);

  console.log(`Created: ${hookFile}`);
  console.log(`Registered: ${event} → hooks/custom/${name}.js`);
  console.log(`\nEdit the file to add your logic, then run: claude-chain init`);
}

function hookAdd(flags: Record<string, string>): void {
  const file = flags.file;
  const event = flags.event;

  if (!file) { console.error('Required: --file <path>'); process.exit(1); }
  if (!event || !HOOK_EVENTS.includes(event as HookEvent)) {
    console.error(`Required: --event <${HOOK_EVENTS.join('|')}>`);
    process.exit(1);
  }

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.hooks[event]) config.hooks[event] = [];

  // Use relative path from CHAIN_HOME
  const relativePath = file.startsWith(CHAIN_HOME)
    ? file.slice(CHAIN_HOME.length + 1)
    : file;

  if (config.hooks[event].includes(relativePath)) {
    console.error(`Hook already registered: ${relativePath} on ${event}`);
    process.exit(1);
  }

  config.hooks[event].push(relativePath);
  saveConfig(config);
  console.log(`Registered: ${event} → ${relativePath}`);
}

function hookEnable(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name || !event) {
    console.error('Required: --name <hook-name> --event <event>');
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.hooks[event]) config.hooks[event] = [];

  const hookPath = findHookPath(name);
  if (!hookPath) { console.error(`Hook not found: ${name}`); process.exit(1); }

  if (config.hooks[event].includes(hookPath)) {
    console.log(`Already enabled: ${hookPath} on ${event}`);
    return;
  }

  config.hooks[event].push(hookPath);
  saveConfig(config);
  console.log(`Enabled: ${event} → ${hookPath}`);
}

function hookDisable(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name || !event) {
    console.error('Required: --name <hook-name> --event <event>');
    process.exit(1);
  }

  const config = loadConfig();
  if (!config.hooks[event]) { console.log('No hooks for this event'); return; }

  const hookPath = findHookPath(name);
  if (!hookPath) { console.error(`Hook not found: ${name}`); process.exit(1); }

  const idx = config.hooks[event].indexOf(hookPath);
  if (idx === -1) { console.log(`Not enabled: ${hookPath} on ${event}`); return; }

  config.hooks[event].splice(idx, 1);
  saveConfig(config);
  console.log(`Disabled: ${hookPath} from ${event}`);
}

function findHookPath(name: string): string | null {
  // Check built-in
  if (existsSync(join(HOOKS_DIR, `${name}.js`))) return `hooks/${name}.js`;
  // Check custom
  if (existsSync(join(CUSTOM_DIR, `${name}.js`))) return `hooks/custom/${name}.js`;
  return null;
}

function generateHookTemplate(name: string, event: string): string {
  return `#!/usr/bin/env node
/**
 * Custom Hook: ${name}
 * Event: ${event}
 *
 * Hook contract:
 *   Input:  stdin JSON payload (see docs for schema per event)
 *   Output: stdout JSON (optional)
 *   Exit:   0 = pass-through, 2 = has output
 *
 * Payload fields (common):
 *   agent_type, agent_id, session_id, last_assistant_message, cwd
 */

const fs = require('fs');

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Skip if stop_hook_active (prevent infinite loops)
    if (payload.stop_hook_active) process.exit(0);

    // --- Your logic here ---
    const agentType = payload.agent_type || '';
    const output = payload.last_assistant_message || '';

    // Example: log something
    // console.error('[${name}] ' + agentType + ' completed');

    // To pass data back to Claude, output JSON and exit 2:
    // console.log(JSON.stringify({
    //   hookSpecificOutput: {
    //     hookEventName: "${event}",
    //     additionalContext: "Your message here"
    //   }
    // }));
    // process.exit(2);

    // Default: pass through
    process.exit(0);

  } catch (e) {
    console.error('[${name}] ' + e.message);
    process.exit(0);
  }
}

main();
`;
}
