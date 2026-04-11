#!/usr/bin/env node

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';
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

  if (eventArg === 'UserPromptSubmit') {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? '';
      const message = (payload.message ?? '').toLowerCase();
      if (sessionId && (message.includes('skip chain') || message.includes('/skip-chain'))) {
        const state = getState(sessionId);
        if (state?.currentAgent) {
          const skipped = state.currentAgent;
          updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0 } as any);
          logToProject(cwd, `SKIP chain step | skipped=${skipped} | session=${sessionId}`);
        }
      }
    } catch { /* ignore */ }
  }

  if (eventArg === 'PreToolUse') {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? '';
      const toolName = payload.tool_name ?? '';
      const toolInput = payload.tool_input ?? {};

      if (toolName === 'Agent' && sessionId) {
        const state = getState(sessionId);
        if (state?.previousAgents?.length) {
          const prev = state.previousAgents[state.previousAgents.length - 1] as { type: string; id?: string };
          if (prev.id) {
            const prevOutputFile = join(homedir(), '.claude', 'tmp', 'agent-outputs', `${prev.id}.md`);
            if (existsSync(prevOutputFile)) {
              const prevOutput = readFileSync(prevOutputFile, 'utf-8');
              if (prevOutput && toolInput.prompt) {
                const injected = `${toolInput.prompt}\n\n---\n\n## Previous Agent Output (${prev.type})\n\n${prevOutput}`;
                logToProject(cwd, `PreToolUse INJECT prev ${prev.type} output (${prevOutput.length} chars) into ${toolInput.subagent_type ?? 'agent'} prompt\nORIGINAL INPUT: ${JSON.stringify(toolInput)}`);
                console.log(JSON.stringify({
                  hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    updatedInput: { ...toolInput, prompt: injected },
                  },
                }));
                process.exit(0);
              }
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  if (eventArg === 'PreToolUse' || eventArg === 'Stop') {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? '';
      const toolName = payload.tool_name ?? '';

      if (sessionId) {
        const state = getState(sessionId);
        if (state?.currentAgent) {
          const next = state.currentAgent;
          const chainContent = readActiveChainContent(cwd);

          if (chainContent) {
            const flowAgentPattern = new RegExp(`^  ${next}:`, 'm');
            if (flowAgentPattern.test(chainContent)) {

              if (eventArg === 'PreToolUse') {
                if (toolName === 'Agent') {
                } else {
                  const blockCount = (state.chainBlockCount ?? 0) + 1;
                  updateState(sessionId, { chainBlockCount: blockCount } as any);
                  logToProject(cwd, `PreToolUse BLOCKED ${toolName} | pending=${next} | count=${blockCount} | session=${sessionId}`);

                  let reason: string;
                  if (blockCount >= 3) {
                    updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0 } as any);
                    reason = `<system-reminder>\nHook blocked ${blockCount} times — releasing. Just spawn **${next}** to satisfy the chain. If work is already done, the agent will finish quickly.\n\nCommand: Use Agent tool with subagent_type="${next}"\n\nOr if the user said to skip: proceed normally.\n</system-reminder>`;
                    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: reason } }));
                    process.exit(0);
                  } else {
                    reason = `<system-reminder>\nChain step pending. Do NOT use ${toolName} — spawn the **${next}** agent first.\n\nCommand: Use Agent tool with subagent_type="${next}"\n</system-reminder>`;
                    console.log(JSON.stringify({ decision: 'block', reason }));
                    process.exit(0);
                  }
                }
              }

              if (eventArg === 'Stop') {
                const blockCount = (state.chainBlockCount ?? 0) + 1;
                updateState(sessionId, { chainBlockCount: blockCount } as any);
                logToProject(cwd, `Stop BLOCKED | pending=${next} | count=${blockCount} | session=${sessionId}`);

                let reason: string;
                if (blockCount >= 3) {
                  updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0 } as any);
                  logToProject(cwd, `Stop RELEASED after ${blockCount} blocks | pending=${next} | session=${sessionId}`);
                  process.exit(0);
                } else {
                  reason = `<system-reminder>\n## MANDATORY NEXT STEP\nYou MUST spawn the **${next}** agent before stopping.\n\nCommand: Use Agent tool with subagent_type="${next}"\n\nDo NOT stop. Do NOT ask the user. Follow the chain.\n</system-reminder>`;
                  console.log(JSON.stringify({ decision: 'block', reason }));
                  process.exit(0);
                }
              }

            }
          }

          if (eventArg === 'Stop') {
            updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0 } as any);
            logToProject(cwd, `Stop CLEARED stale currentAgent=${next} | session=${sessionId}`);
          }
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
