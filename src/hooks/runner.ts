#!/usr/bin/env node
/**
 * Hook Runner — Single entry point for all Claude Code hooks.
 *
 * Invoked by plugin's hooks.json with event name as arg:
 *   "command": "node \"$CLAUDE_PLUGIN_ROOT/scripts/runner.cjs\" PostToolUse"
 *
 * Runner loads hooks from project config:
 *   ${cwd}/.claude/chain-config.yaml
 *
 * If no project config exists, no custom hooks run.
 *
 * Script path resolution:
 *   - "plugin:foo.cjs"  → ${CLAUDE_PLUGIN_ROOT}/scripts/foo.cjs
 *   - "./foo.js"        → ${cwd}/.claude/hooks/foo.js
 *   - "/absolute/path"  → as-is
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

// Plugin root from env, fallback to script location
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(__filename));
const PLUGIN_SCRIPTS = join(PLUGIN_ROOT, 'scripts');

interface HookConfig {
  hooks: Record<string, string[]>;
}

function parseYamlConfig(content: string): HookConfig {
  const config: HookConfig = { hooks: {} };
  let currentEvent = '';

  for (const line of content.split('\n')) {
    const eventMatch = line.match(/^\s{2}(\S+):$/);
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

function resolveScriptPath(script: string, cwd: string): string {
  // Plugin scripts: "plugin:foo.cjs"
  if (script.startsWith('plugin:')) {
    return join(PLUGIN_SCRIPTS, script.replace('plugin:', ''));
  }

  // Local scripts: "./foo.js" or "../foo.js"
  if (script.startsWith('./') || script.startsWith('../')) {
    return join(cwd, '.claude', 'hooks', script.replace(/^\.\//, ''));
  }

  // Absolute paths: as-is
  if (script.startsWith('/')) {
    return script;
  }

  // Default: treat as plugin script name (backward compat)
  return join(PLUGIN_SCRIPTS, script);
}

// Default plugin hooks that always run (even without project config)
const DEFAULT_PLUGIN_HOOKS: Record<string, string[]> = {
  SessionStart: ['session-start.cjs'],
  SessionEnd: ['session-end.cjs'],
};

function loadProjectHooks(event: string, cwd: string): string[] {
  const hooks: string[] = [];

  // Add default plugin hooks first
  const defaults = DEFAULT_PLUGIN_HOOKS[event] || [];
  hooks.push(...defaults.map(h => join(PLUGIN_SCRIPTS, h)));

  // Add project-specific hooks
  const configPath = join(cwd, '.claude', 'chain-config.yaml');
  if (existsSync(configPath)) {
    const config = parseYamlConfig(readFileSync(configPath, 'utf-8'));
    const projectHooks = (config.hooks[event] || []).map(h => resolveScriptPath(h, cwd));
    hooks.push(...projectHooks);
  }

  return hooks;
}

function runHook(hookPath: string, stdin: string): { output?: string; block?: boolean; exit2?: boolean } {
  if (!existsSync(hookPath)) {
    console.error(`[runner] Hook not found: ${hookPath}`);
    return {};
  }

  try {
    const result = execSync(`node "${hookPath}"`, {
      input: stdin,
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const trimmed = result.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.decision === 'block') {
          return { output: trimmed, block: true };
        }
      } catch { /* not JSON */ }
      return { output: trimmed };
    }
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    if (e.status === 2 && e.stdout) {
      return { output: e.stdout.trim(), exit2: true };
    }
    if (e.stderr) console.error(e.stderr);
  }

  return {};
}

function main(): void {
  const eventArg = process.argv[2];
  if (!eventArg) {
    console.error('Usage: runner.cjs <EventName>');
    process.exit(0);
  }

  // Read stdin
  let stdin = '';
  try {
    stdin = readFileSync(0, 'utf-8').trim();
  } catch {
    process.exit(0);
  }
  if (!stdin) process.exit(0);

  // Extract CWD from payload
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(stdin);
    if (payload.cwd) cwd = payload.cwd;
  } catch { /* use process.cwd */ }

  // Load hooks from project config only (no global)
  const hooks = loadProjectHooks(eventArg, cwd);

  if (hooks.length === 0) {
    process.exit(0);
  }

  // Run hooks sequentially
  for (const hookPath of hooks) {
    const result = runHook(hookPath, stdin);

    if (result.block) {
      console.log(result.output);
      process.exit(0);
    }

    if (result.exit2) {
      console.log(result.output);
      process.exit(2);
    }

    if (result.output) {
      console.log(result.output);
    }
  }
}

main();
