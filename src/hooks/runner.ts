#!/usr/bin/env node
/**
 * Hook Runner — Single entry point for all Claude Code hooks.
 *
 * Execution order (2 layers):
 *   1. User custom hooks  — from .claude/hooks.yaml (per-project, easy customize)
 *   2. Chain hooks        — from chain-config.yaml (only when chain is active)
 *
 * Script path resolution:
 *   - "plugin:foo.cjs"  → ${CLAUDE_PLUGIN_ROOT}/scripts/foo.cjs
 *   - "./foo.js"        → ${cwd}/.claude/hooks/foo.js
 *   - "/absolute/path"  → as-is
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync } from 'child_process';
import { readActiveChainContent } from '../utils/chain-resolver.js';
import { getState, updateState } from '../utils/state.js';

function logToProject(cwd: string, msg: string): void {
  try {
    const tmpDir = join(cwd, '.claude', 'tmp');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
    const logFile = join(tmpDir, 'runner.log');
    appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore log failures */ }
}

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(__filename));
const PLUGIN_SCRIPTS = join(PLUGIN_ROOT, 'scripts');

interface HookConfig {
  hooks: Record<string, string[]>;
}

// ─── Layer 1: User custom hooks ──────────────────────────────────────────────

function parseSimpleYaml(content: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let currentKey = '';

  for (const line of content.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;

    const keyMatch = line.match(/^(\S+):\s*$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      result[currentKey] = [];
      continue;
    }

    const itemMatch = line.match(/^\s+-\s+(.+)/);
    if (itemMatch && currentKey) {
      result[currentKey].push(itemMatch[1].trim());
    }
  }
  return result;
}

function resolveScriptPath(script: string, cwd: string): string | null {
  if (script.startsWith('plugin:')) {
    return join(PLUGIN_SCRIPTS, script.replace('plugin:', ''));
  }

  if (script.startsWith('./') || script.startsWith('../')) {
    const resolved = resolve(join(cwd, '.claude', 'hooks', script));
    const base = resolve(join(cwd, '.claude'));
    if (!resolved.startsWith(base)) return null;
    return resolved;
  }

  if (script.startsWith('/')) {
    return script;
  }

  return join(PLUGIN_SCRIPTS, script);
}

function getUserHooks(event: string, cwd: string): string[] {
  const configPath = join(cwd, '.claude', 'hooks.yaml');
  if (!existsSync(configPath)) return [];

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = parseSimpleYaml(content);
    const scripts = config[event] || [];
    return scripts
      .map(s => resolveScriptPath(s, cwd))
      .filter((p): p is string => p !== null);
  } catch {
    return [];
  }
}

// ─── Layer 2: Chain hooks ────────────────────────────────────────────────────

function parseChainHooksConfig(content: string): HookConfig {
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

function getChainHooks(event: string, cwd: string): string[] {
  const chainContent = readActiveChainContent(cwd);
  if (!chainContent) return [];

  try {
    const config = parseChainHooksConfig(chainContent);
    return (config.hooks[event] || [])
      .map(s => resolveScriptPath(s, cwd))
      .filter((p): p is string => p !== null);
  } catch {
    return [];
  }
}

// ─── Hook execution ──────────────────────────────────────────────────────────

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

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const eventArg = process.argv[2];
  if (!eventArg) {
    console.error('Usage: runner.cjs <EventName>');
    process.exit(0);
  }

  let stdin = '';
  try {
    stdin = readFileSync(0, 'utf-8').trim();
  } catch {
    process.exit(0);
  }
  if (!stdin) process.exit(0);

  let cwd = process.cwd();
  try {
    const payload = JSON.parse(stdin);
    if (payload.cwd) cwd = payload.cwd;
  } catch { /* use process.cwd */ }

  // Stop hook: block if chain has a pending next agent that exists in current flow
  if (eventArg === 'Stop') {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? '';
      if (sessionId) {
        const state = getState(sessionId);
        if (state?.currentAgent) {
          const next = state.currentAgent;
          const chainContent = readActiveChainContent(cwd);
          if (chainContent) {
            const flowAgentPattern = new RegExp(`^  ${next}:`, 'm');
            if (flowAgentPattern.test(chainContent)) {
              logToProject(cwd, `Stop BLOCKED | pending=${next} | session=${sessionId}`);
              console.log(JSON.stringify({
                decision: 'block',
                reason: `<system-reminder>\n## MANDATORY NEXT STEP\nYou MUST spawn the **${next}** agent before stopping.\n\nCommand: Use Agent tool with subagent_type="${next}"\n\nDo NOT stop. Do NOT ask the user. Follow the chain.\n</system-reminder>`,
              }));
              process.exit(0);
            }
          }
          // currentAgent not in current chain flow — stale, clear it
          updateState(sessionId, { currentAgent: undefined } as any);
          logToProject(cwd, `Stop CLEARED stale currentAgent=${next} | session=${sessionId}`);
        }
      }
    } catch { /* fall through to normal hook processing */ }
  }

  const userHooks = getUserHooks(eventArg, cwd);
  const chainHooks = getChainHooks(eventArg, cwd);
  const hooks = [...userHooks, ...chainHooks];

  logToProject(cwd, `${eventArg} | cwd=${cwd} | userHooks=${userHooks.length} | chainHooks=${chainHooks.length} | total=${hooks.length}`);

  if (hooks.length === 0) process.exit(0);

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
