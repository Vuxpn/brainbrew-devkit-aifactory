import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import {
  getProjectDir,
  getProjectHooksDir,
  getProjectChainConfig,
  encodeCwd,
} from '../../utils/paths.js';
import { HOOK_EVENTS, type HookEvent, type HookConfig } from './hook-constants.js';
import { parseSimpleYaml, generateHookTemplate } from './hook-utils.js';

function loadProjectConfig(cwd: string): HookConfig {
  const configFile = getProjectChainConfig(cwd);
  if (!existsSync(configFile)) {
    return { hooks: {} };
  }
  return parseSimpleYaml(readFileSync(configFile, 'utf-8'));
}

function saveProjectConfig(cwd: string, config: HookConfig): void {
  const projectDir = getProjectDir(cwd);
  const configFile = getProjectChainConfig(cwd);

  if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });

  const lines = ['# Per-project hook configuration', '# Hooks run AFTER global hooks', '', 'hooks:'];
  for (const [event, hooks] of Object.entries(config.hooks)) {
    if (hooks.length === 0) continue;
    lines.push(`  ${event}:`);
    for (const hook of hooks) {
      lines.push(`    - ${hook}`);
    }
  }
  writeFileSync(configFile, lines.join('\n') + '\n');
}

export function projectHookList(flags: Record<string, string>): void {
  const cwd = flags.cwd || process.cwd();
  const projectDir = getProjectDir(cwd);
  const hooksDir = getProjectHooksDir(cwd);
  const config = loadProjectConfig(cwd);

  console.log(`Project: ${cwd}`);
  console.log(`Encoded: ${encodeCwd(cwd)}`);
  console.log(`Path: ${projectDir}\n`);

  // List config entries
  const hasConfig = Object.keys(config.hooks).some(e => config.hooks[e].length > 0);
  if (hasConfig) {
    console.log('Registered hooks:');
    for (const [event, hooks] of Object.entries(config.hooks)) {
      if (hooks.length === 0) continue;
      console.log(`  ${event}:`);
      for (const hook of hooks) {
        const fullPath = join(projectDir, hook);
        const exists = existsSync(fullPath);
        const icon = exists ? '✓' : '✗';
        console.log(`    ${icon} ${hook}${exists ? '' : ' [MISSING]'}`);
      }
    }
  } else {
    console.log('No hooks registered.');
  }

  // List hook files
  if (existsSync(hooksDir)) {
    const files = readdirSync(hooksDir).filter(f => f.endsWith('.js'));
    if (files.length > 0) {
      console.log('\nHook files:');
      for (const file of files) {
        console.log(`  ${file}`);
      }
    }
  }

  console.log('\nAdd hook: brainbrew hook project-add --name <name> --event <event>');
}

export function projectHookAdd(flags: Record<string, string>): void {
  const name = flags.name;
  const event = flags.event;
  const cwd = flags.cwd || process.cwd();

  if (!name) { console.error('Required: --name <hook-name>'); process.exit(1); }
  if (!event || !HOOK_EVENTS.includes(event as HookEvent)) {
    console.error(`Required: --event <event>\nValid events: ${HOOK_EVENTS.join(', ')}`);
    process.exit(1);
  }

  const hooksDir = getProjectHooksDir(cwd);
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

  const hookFile = join(hooksDir, `${name}.js`);
  if (existsSync(hookFile)) {
    console.error(`Hook already exists: ${hookFile}`);
    process.exit(1);
  }

  // Create hook file
  const template = generateHookTemplate(name, event);
  writeFileSync(hookFile, template);

  // Register in project config
  const config = loadProjectConfig(cwd);
  if (!config.hooks[event]) config.hooks[event] = [];
  const hookPath = `custom-hooks/${name}.js`;
  if (!config.hooks[event].includes(hookPath)) {
    config.hooks[event].push(hookPath);
  }
  saveProjectConfig(cwd, config);

  console.log(`Created: ${hookFile}`);
  console.log(`Registered: ${event} → ${hookPath}`);
  console.log(`\nProject: ${cwd}`);
  console.log(`Config: ${getProjectChainConfig(cwd)}`);
  console.log(`\nEdit the hook file to add your logic.`);
  console.log(`\nTest with:`);
  console.log(`  echo '{"cwd":"${cwd}"}' | node ${hookFile}`);
}

export function projectHookRemove(flags: Record<string, string>): void {
  const name = flags.name;
  const cwd = flags.cwd || process.cwd();

  if (!name) { console.error('Required: --name <hook-name>'); process.exit(1); }

  const hooksDir = getProjectHooksDir(cwd);
  const hookFile = join(hooksDir, `${name}.js`);

  if (!existsSync(hookFile)) {
    console.error(`Hook not found: ${hookFile}`);
    process.exit(1);
  }

  // Remove from config
  const config = loadProjectConfig(cwd);
  const hookPath = `custom-hooks/${name}.js`;
  let removed = false;
  for (const event of Object.keys(config.hooks)) {
    const idx = config.hooks[event].indexOf(hookPath);
    if (idx !== -1) {
      config.hooks[event].splice(idx, 1);
      removed = true;
      console.log(`Unregistered from: ${event}`);
    }
  }

  // Save config or remove if empty
  const hasHooks = Object.values(config.hooks).some(arr => arr.length > 0);
  if (hasHooks) {
    saveProjectConfig(cwd, config);
  } else {
    const configFile = getProjectChainConfig(cwd);
    if (existsSync(configFile)) {
      unlinkSync(configFile);
      console.log(`Removed empty config: ${configFile}`);
    }
  }

  // Delete file
  unlinkSync(hookFile);
  console.log(`Deleted: ${hookFile}`);

  // Clean up empty hooks dir
  if (existsSync(hooksDir)) {
    const remaining = readdirSync(hooksDir);
    if (remaining.length === 0) {
      rmdirSync(hooksDir);
      console.log(`Removed empty directory: ${hooksDir}`);
    }
  }
}
