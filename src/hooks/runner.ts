#!/usr/bin/env node
/**
 * Hook Runner — Single entry point for all Claude Code hooks.
 *
 * settings.json points here with event name as arg:
 *   "command": "node ~/.claude/hooks/chains/runner.js PostToolUse"
 *
 * Runner loads:
 *   1. Global hooks from ~/.claude/hooks/chains/hooks-config.yaml
 *   2. Per-project hooks from ~/.claude/projects/{encoded-cwd}/chain-config.yaml
 *
 * Hooks run sequentially. If any hook outputs JSON (exit 2) or blocks, that result is used.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks', 'chains');
const GLOBAL_CONFIG = join(HOOKS_DIR, 'hooks-config.yaml');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

interface HookConfig {
  hooks: Record<string, string[]>;
}

function encodeCwd(cwd: string): string {
  return cwd.replace(/\//g, '-');
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

function loadGlobalHooks(event: string): string[] {
  if (!existsSync(GLOBAL_CONFIG)) return [];
  const config = parseYamlConfig(readFileSync(GLOBAL_CONFIG, 'utf-8'));
  return (config.hooks[event] || []).map(h =>
    h.startsWith('/') ? h : join(HOOKS_DIR, h)
  );
}

function loadProjectHooks(event: string, cwd: string): string[] {
  const projectDir = join(PROJECTS_DIR, encodeCwd(cwd));
  const configFile = join(projectDir, 'chain-config.yaml');

  if (!existsSync(configFile)) return [];

  const config = parseYamlConfig(readFileSync(configFile, 'utf-8'));
  return (config.hooks[event] || []).map(h =>
    h.startsWith('/') ? h : join(projectDir, h)
  );
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
    console.error('Usage: runner.js <EventName>');
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

  // Extract CWD from payload for per-project hooks
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(stdin);
    if (payload.cwd) cwd = payload.cwd;
  } catch { /* use process.cwd */ }

  // Collect hooks: global first, then per-project
  const globalHooks = loadGlobalHooks(eventArg);
  const projectHooks = loadProjectHooks(eventArg, cwd);
  const allHooks = [...globalHooks, ...projectHooks];

  if (allHooks.length === 0) {
    // Fallback: try built-in hook directly
    const builtinPath = join(HOOKS_DIR, `${eventArg.toLowerCase()}.js`);
    if (existsSync(builtinPath)) {
      const result = runHook(builtinPath, stdin);
      if (result.output) console.log(result.output);
      if (result.exit2) process.exit(2);
    }
    process.exit(0);
  }

  // Run hooks sequentially
  for (const hookPath of allHooks) {
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
