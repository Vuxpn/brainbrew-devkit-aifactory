#!/usr/bin/env node

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { readActiveChainContent, listChains, getActiveChainName, resolveActiveChain } from '../utils/chain-resolver.js';
import { getState, updateState } from '../utils/state.js';

function listChainsWithAgents(cwd: string): string {
  const chains = listChains(cwd);
  if (chains.length === 0) return '';
  const active = getActiveChainName(cwd);
  const resolved = resolveActiveChain(cwd);
  const chainsDir = resolved ? dirname(resolved.configPath).replace(cwd + '/', '') + '/' : '.claude/chains/';
  const lines: string[] = [];
  for (const c of chains) {
    const chainPath = join(cwd, chainsDir, `${c}.yaml`);
    let agents = '';
    if (existsSync(chainPath)) {
      const content = readFileSync(chainPath, 'utf-8');
      const flowSection = content.split(/^flow:\s*$/m)[1] ?? '';
      const flowAgents = [...flowSection.matchAll(/^  (\S+):/gm)].map(m => m[1]);
      agents = flowAgents.join(' → ');
    }
    const marker = c === active ? ' (active)' : '';
    lines.push(`  - ${c}${marker}: ${agents}`);
  }
  return lines.join('\n');
}

const RUNNER_LOG_DIR = join(homedir(), '.claude', 'tmp');
const RUNNER_LOG = join(RUNNER_LOG_DIR, 'runner.log');

function logToProject(_cwd: string, msg: string): void {
  try {
    if (!existsSync(RUNNER_LOG_DIR)) mkdirSync(RUNNER_LOG_DIR, { recursive: true });
    appendFileSync(RUNNER_LOG, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
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
      const message = (payload.prompt ?? '').toLowerCase();
      if (sessionId) {
        const state = getState(sessionId);
        if (message.includes('skip chain') || message.includes('/skip-chain')) {
          if (state?.currentAgent) {
            const skipped = state.currentAgent;
            updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0, allowedAgents: [] } as any);
            logToProject(cwd, `SKIP chain step | skipped=${skipped} | session=${sessionId}`);
          }
        } else if (state?.chainBlockCount && state.chainBlockCount > 0) {
          updateState(sessionId, { chainBlockCount: 0 } as any);
          logToProject(cwd, `RESET blockCount on user message | session=${sessionId}`);
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
          const prev = state.previousAgents[state.previousAgents.length - 1] as { type: string; id?: string; completedAt?: string };
          const prevAge = prev.completedAt ? Date.now() - new Date(prev.completedAt).getTime() : Infinity;
          const MAX_AGE_MS = 10 * 60 * 1000;
          if (prev.id && prevAge < MAX_AGE_MS) {
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
                if (toolName.includes('chain_run')) {
                } else if (toolName === 'Agent') {
                  const requestedAgent = (payload.tool_input?.subagent_type ?? '').toLowerCase();
                  const allowed = (state as unknown as Record<string, unknown>).allowedAgents as string[] | undefined;
                  const allowedList = allowed && allowed.length > 0 ? allowed : (next ? [next] : []);
                  if (requestedAgent && !allowedList.includes(requestedAgent)) {
                    const chainsList = listChainsWithAgents(cwd);
                    const allowedStr = allowedList.map(a => `**${a}**`).join(' or ');
                    logToProject(cwd, `PreToolUse BLOCKED Agent(${requestedAgent}) | allowed=[${allowedList.join(',')}] | session=${sessionId}`);
                    console.log(JSON.stringify({
                      decision: 'block',
                      reason: `<system-reminder>\nWrong agent. Chain allows ${allowedStr} but you tried to spawn **${requestedAgent}**.\n\nSpawn one of: ${allowedList.map(a => `Agent(subagent_type="${a}")`).join(' or ')}\n\nTo switch workflow, use chain_run:\nmcp__plugin_brainbrew-devkit_brainbrew__chain_run(chain: "<name>", session_id: "${sessionId}")\n\nAvailable chains:\n${chainsList}\n</system-reminder>`,
                    }));
                    process.exit(0);
                  }
                } else {
                  const blockCount = (state.chainBlockCount ?? 0) + 1;
                  updateState(sessionId, { chainBlockCount: blockCount } as any);
                  logToProject(cwd, `PreToolUse BLOCKED ${toolName} | pending=${next} | count=${blockCount} | session=${sessionId}`);

                  const chainsList = listChainsWithAgents(cwd);
                  const reason = `<system-reminder>\nChain step pending. Do NOT use ${toolName} — spawn the **${next}** agent first.\n\nCommand: Use Agent tool with subagent_type="${next}"\n\nTo switch workflow, use chain_run:\nmcp__plugin_brainbrew-devkit_brainbrew__chain_run(chain: "<name>", session_id: "${sessionId}")\n\nAvailable chains:\n${chainsList}\n</system-reminder>`;
                  console.log(JSON.stringify({ decision: 'block', reason }));
                  process.exit(0);
                }
              }

              if (eventArg === 'Stop') {
                logToProject(cwd, `Stop BLOCKED | pending=${next} | session=${sessionId}`);
                const reason = `<system-reminder>\n## MANDATORY NEXT STEP\nYou MUST spawn the **${next}** agent before stopping.\n\nCommand: Use Agent tool with subagent_type="${next}"\n\nDo NOT stop. Do NOT ask the user. Follow the chain.\n</system-reminder>`;
                console.log(JSON.stringify({ decision: 'block', reason }));
                process.exit(0);
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
