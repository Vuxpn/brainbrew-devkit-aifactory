import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { HOOKS_DIR, CUSTOM_HOOKS_DIR } from '../../utils/paths.js';
import { HOOK_EVENTS, type HookEvent } from './hook-constants.js';
import { generateHookTemplate } from './hook-utils.js';
import { loadGlobalConfig, saveGlobalConfig, findGlobalHookPath } from './hook-global-config.js';

export function hookList(): void {
  const config = loadGlobalConfig();

  if (Object.keys(config.hooks).length === 0) {
    console.log('No global hooks configured.');
    console.log('Run: brainbrew hook scaffold --name <name> --event <event>');
    return;
  }

  console.log('Global hooks (~/.claude/hooks/chains/):\n');
  for (const [event, hooks] of Object.entries(config.hooks)) {
    if (hooks.length === 0) continue;
    console.log(`  ${event}:`);
    for (const hook of hooks) {
      const fullPath = join(HOOKS_DIR, hook);
      const exists = existsSync(fullPath);
      const icon = exists ? '✓' : '✗';
      const tag = hook.includes('custom/') ? '(custom)' : '(built-in)';
      console.log(`    ${icon} ${hook} ${tag}${exists ? '' : ' [MISSING]'}`);
    }
  }
}

export function hookScaffold(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name) { console.error('Required: --name <hook-name>'); process.exit(1); }
  if (!event || !HOOK_EVENTS.includes(event as HookEvent)) {
    console.error(`Required: --event <event>\nValid events: ${HOOK_EVENTS.join(', ')}`);
    process.exit(1);
  }

  if (!existsSync(CUSTOM_HOOKS_DIR)) mkdirSync(CUSTOM_HOOKS_DIR, { recursive: true });

  const hookFile = join(CUSTOM_HOOKS_DIR, `${name}.js`);
  if (existsSync(hookFile)) {
    console.error(`Hook already exists: ${hookFile}`);
    process.exit(1);
  }

  const template = generateHookTemplate(name, event);
  writeFileSync(hookFile, template);

  const config = loadGlobalConfig();
  if (!config.hooks[event]) config.hooks[event] = [];
  const hookPath = `custom/${name}.js`;
  if (!config.hooks[event].includes(hookPath)) {
    config.hooks[event].push(hookPath);
  }
  saveGlobalConfig(config);

  console.log(`Created: ${hookFile}`);
  console.log(`Registered: ${event} → custom/${name}.js`);
  console.log(`\nEdit the file to add your logic.`);
}

export function hookAdd(flags: Record<string, string>): void {
  const file = flags.file;
  const event = flags.event;

  if (!file) { console.error('Required: --file <path>'); process.exit(1); }
  if (!event || !HOOK_EVENTS.includes(event as HookEvent)) {
    console.error(`Required: --event <event>\nValid events: ${HOOK_EVENTS.join(', ')}`);
    process.exit(1);
  }

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const config = loadGlobalConfig();
  if (!config.hooks[event]) config.hooks[event] = [];

  let hookPath = file;
  if (file.startsWith(HOOKS_DIR)) {
    hookPath = file.slice(HOOKS_DIR.length + 1);
  }

  if (config.hooks[event].includes(hookPath)) {
    console.error(`Hook already registered: ${hookPath} on ${event}`);
    process.exit(1);
  }

  config.hooks[event].push(hookPath);
  saveGlobalConfig(config);
  console.log(`Registered: ${event} → ${hookPath}`);
}

export function hookEnable(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name || !event) {
    console.error('Required: --name <hook-name> --event <event>');
    process.exit(1);
  }

  const config = loadGlobalConfig();
  if (!config.hooks[event]) config.hooks[event] = [];

  const hookPath = findGlobalHookPath(name);
  if (!hookPath) { console.error(`Hook not found: ${name}`); process.exit(1); }

  if (config.hooks[event].includes(hookPath)) {
    console.log(`Already enabled: ${hookPath} on ${event}`);
    return;
  }

  config.hooks[event].push(hookPath);
  saveGlobalConfig(config);
  console.log(`Enabled: ${event} → ${hookPath}`);
}

export function hookDisable(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;

  if (!name || !event) {
    console.error('Required: --name <hook-name> --event <event>');
    process.exit(1);
  }

  const config = loadGlobalConfig();
  if (!config.hooks[event]) { console.log('No hooks for this event'); return; }

  const hookPath = findGlobalHookPath(name);
  if (!hookPath) { console.error(`Hook not found: ${name}`); process.exit(1); }

  const idx = config.hooks[event].indexOf(hookPath);
  if (idx === -1) { console.log(`Not enabled: ${hookPath} on ${event}`); return; }

  config.hooks[event].splice(idx, 1);
  saveGlobalConfig(config);
  console.log(`Disabled: ${hookPath} from ${event}`);
}

export function hookRemove(flags: Record<string, string>): void {
  const name = flags.name;

  if (!name) { console.error('Required: --name <hook-name>'); process.exit(1); }

  const hookFile = join(CUSTOM_HOOKS_DIR, `${name}.js`);
  if (!existsSync(hookFile)) {
    console.error(`Custom hook not found: ${hookFile}`);
    console.log('Note: Only custom hooks can be removed.');
    process.exit(1);
  }

  const config = loadGlobalConfig();
  const hookPath = `custom/${name}.js`;
  let removed = false;
  for (const event of Object.keys(config.hooks)) {
    const idx = config.hooks[event].indexOf(hookPath);
    if (idx !== -1) {
      config.hooks[event].splice(idx, 1);
      removed = true;
      console.log(`Unregistered from: ${event}`);
    }
  }
  if (removed) saveGlobalConfig(config);

  unlinkSync(hookFile);
  console.log(`Deleted: ${hookFile}`);
}
