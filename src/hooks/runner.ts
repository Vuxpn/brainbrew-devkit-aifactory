#!/usr/bin/env node
/**
 * Hook Runner — Single entry point for all Claude Code hooks.
 *
 * settings.json points here with event name as arg:
 *   "command": "node ~/.claude-chain/hooks/runner.js PostToolUse"
 *   "command": "node ~/.claude-chain/hooks/runner.js SubagentStop"
 *
 * Runner reads config.yaml, finds all hooks for the event, runs them sequentially.
 * If any hook outputs JSON (exit 2) or blocks (decision: block), that result is used.
 *
 * Supports ALL 22 Claude Code hook events.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const CHAIN_HOME = join(homedir(), '.claude-chain');
const CONFIG_FILE = join(CHAIN_HOME, 'config.yaml');

interface HookConfig {
  hooks: Record<string, string[]>;
}

function parseConfig(content: string): HookConfig {
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

function main(): void {
  const eventArg = process.argv[2];
  if (!eventArg) {
    console.error('Usage: runner.js <EventName>');
    process.exit(0);
  }

  // Read stdin once
  let stdin = '';
  try {
    stdin = readFileSync(0, 'utf-8').trim();
  } catch {
    process.exit(0);
  }
  if (!stdin) process.exit(0);

  // Load config
  if (!existsSync(CONFIG_FILE)) {
    // Fallback: try built-in hook directly
    const builtinPath = join(CHAIN_HOME, 'hooks', `${eventArg}.js`);
    if (existsSync(builtinPath)) {
      runHook(builtinPath, stdin);
    }
    process.exit(0);
  }

  const config = parseConfig(readFileSync(CONFIG_FILE, 'utf-8'));
  const hooks = config.hooks[eventArg] || [];

  if (hooks.length === 0) process.exit(0);

  // Run hooks sequentially
  for (const hookPath of hooks) {
    const fullPath = hookPath.startsWith('/')
      ? hookPath
      : join(CHAIN_HOME, hookPath);

    if (!existsSync(fullPath)) {
      console.error(`[runner] Hook not found: ${fullPath}`);
      continue;
    }

    try {
      const result = execSync(`node "${fullPath}"`, {
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
          // Block decision stops chain immediately
          if (parsed.decision === 'block') {
            console.log(trimmed);
            process.exit(0);
          }
        } catch { /* not JSON, continue */ }
        console.log(trimmed);
      }
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      // Exit code 2 = hook has output for Claude
      if (e.status === 2 && e.stdout) {
        console.log(e.stdout.trim());
        process.exit(2);
      }
      if (e.stderr) console.error(e.stderr);
    }
  }
}

function runHook(hookPath: string, stdin: string): void {
  try {
    const result = execSync(`node "${hookPath}"`, {
      input: stdin,
      encoding: 'utf-8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (result.trim()) console.log(result.trim());
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 2 && e.stdout) {
      console.log(e.stdout.trim());
      process.exit(2);
    }
  }
}

main();
