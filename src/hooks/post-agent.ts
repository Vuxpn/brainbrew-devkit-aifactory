import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { callHaiku } from '../ai/haiku.js';
import { getState, updateState } from '../utils/state.js';
import { log, logEvent } from '../utils/logger.js';
import { TMP_DIR } from '../utils/paths.js';
import { readActiveChainContent } from '../utils/chain-resolver.js';

const LOG_FILE = join(TMP_DIR, 'agent-output.log');
const PLANS_DIR = join(homedir(), '.claude', 'plans');
const MAX_AGENT_LOOPS = 0;

// ─── Flow Config ─────────────────────────────────────────────────────────────

interface TeammateConfig {
  name: string;
  agent: string;
  prompt?: string;
  model?: string;
}

interface FlowEntry {
  type?: 'agent' | 'team';
  teammates?: TeammateConfig[];
  routes?: Record<string, string>;
  decide?: string;
  next?: string | null;
  on_issues?: string;
  on_fail?: string;
  reset_counters?: string;
}

interface ChainConfig {
  hooks?: Record<string, string[]>;
  flow?: Record<string, FlowEntry>;
  saveOutput?: string[];
}

const DEFAULT_SAVE_AGENTS = ['explore'];

function loadChainConfig(cwd: string): ChainConfig {
  try {
    const content = readActiveChainContent(cwd);
    if (!content) return { saveOutput: [...DEFAULT_SAVE_AGENTS] };
    return parseSimpleYaml(content);
  } catch {
    return { saveOutput: [...DEFAULT_SAVE_AGENTS] };
  }
}

function parseSimpleYaml(content: string): ChainConfig {
  const config: ChainConfig = { flow: {}, saveOutput: [...DEFAULT_SAVE_AGENTS] };
  let currentSection = '';
  let currentAgent = '';
  let currentSubSection = '';
  let multilineKey = '';
  let multilineValue = '';
  let multilineIndent = 0;
  let currentTeammate: TeammateConfig | null = null;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (multilineKey && currentAgent) {
      const lineIndent = line.search(/\S|$/);
      if (lineIndent > multilineIndent || line.trim() === '') {
        multilineValue += (multilineValue ? '\n' : '') + line.trim();
        continue;
      } else {
        (config.flow![currentAgent] as Record<string, string>)[multilineKey] = multilineValue;
        multilineKey = '';
        multilineValue = '';
        multilineIndent = 0;
      }
    }

    if (line.trim().startsWith('#') || !line.trim()) continue;

    const sectionMatch = line.match(/^(\w+):$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentAgent = '';
      currentSubSection = '';
      currentTeammate = null;
      continue;
    }

    if (currentSection === 'saveOutput') {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        if (!config.saveOutput) config.saveOutput = [];
        config.saveOutput.push(itemMatch[1].trim().toLowerCase());
      }
      continue;
    }

    if (currentSection === 'flow') {
      const agentMatch = line.match(/^  (\S+):$/);
      if (agentMatch) {
        if (currentTeammate && currentSubSection === 'teammates') {
          config.flow![currentAgent].teammates!.push(currentTeammate);
        }
        currentAgent = agentMatch[1];
        currentSubSection = '';
        currentTeammate = null;
        config.flow![currentAgent] = {};
        continue;
      }

      const subSectionMatch = line.match(/^    (routes|teammates):$/);
      if (subSectionMatch && currentAgent) {
        if (currentTeammate && currentSubSection === 'teammates') {
          config.flow![currentAgent].teammates!.push(currentTeammate);
        }
        currentSubSection = subSectionMatch[1];
        currentTeammate = null;
        if (currentSubSection === 'routes') {
          config.flow![currentAgent].routes = {};
        } else if (currentSubSection === 'teammates') {
          config.flow![currentAgent].teammates = [];
        }
        continue;
      }

      if (currentSubSection === 'teammates' && currentAgent) {
        const arrayItemMatch = line.match(/^      - (\w+):\s*"?([^"]*)"?$/);
        if (arrayItemMatch) {
          if (currentTeammate) {
            config.flow![currentAgent].teammates!.push(currentTeammate);
          }
          currentTeammate = { name: '', agent: '' };
          const [, key, value] = arrayItemMatch;
          (currentTeammate as unknown as Record<string, string>)[key] = value.trim();
          continue;
        }

        const teammatePropMatch = line.match(/^        (\w+):\s*"?([^"]*)"?$/);
        if (teammatePropMatch && currentTeammate) {
          const [, key, value] = teammatePropMatch;
          (currentTeammate as unknown as Record<string, string>)[key] = value.trim();
          continue;
        }

        if (currentTeammate && !line.match(/^      /)) {
          config.flow![currentAgent].teammates!.push(currentTeammate);
          currentTeammate = null;
          currentSubSection = '';
        }
      }

      if (currentSubSection === 'routes' && currentAgent) {
        const routeMatch = line.match(/^      (\S+):\s*"?([^"]*)"?$/);
        if (routeMatch) {
          const [, routeAgent, description] = routeMatch;
          config.flow![currentAgent].routes![routeAgent] = description.trim();
          continue;
        }
      }

      const multilineMatch = line.match(/^    (\w+):\s*\|$/);
      if (multilineMatch && currentAgent) {
        if (currentSubSection === 'teammates' && currentTeammate) {
          config.flow![currentAgent].teammates!.push(currentTeammate);
          currentTeammate = null;
        }
        currentSubSection = '';
        multilineKey = multilineMatch[1];
        multilineValue = '';
        multilineIndent = 4;
        continue;
      }

      const propMatch = line.match(/^    (\w+):\s*(.+)/);
      if (propMatch && currentAgent && !currentSubSection) {
        const [, key, value] = propMatch;
        const cleanValue = value.trim() === 'null' ? null : value.trim();
        (config.flow![currentAgent] as Record<string, string | null>)[key] = cleanValue;
      }
    }
  }

  if (multilineKey && currentAgent && multilineValue) {
    (config.flow![currentAgent] as Record<string, string>)[multilineKey] = multilineValue;
  }

  if (currentTeammate && currentAgent && currentSubSection === 'teammates') {
    config.flow![currentAgent].teammates!.push(currentTeammate);
  }

  return config;
}

function getNextAgent(
  agentType: string,
  output: string,
  config: ChainConfig
): { next: string | null; reason: string } {
  const flow = config.flow?.[agentType.toLowerCase()];
  if (!flow) {
    return { next: null, reason: 'No flow defined for this agent' };
  }

  const routes: Record<string, string> = flow.routes ?? {};
  if (!flow.routes) {
    if (flow.next) routes['next'] = flow.next;
    if (flow.on_fail) routes['on_fail'] = flow.on_fail;
    if (flow.on_issues) routes['on_issues'] = flow.on_issues;
  }

  const routeNames = Object.keys(routes);
  const defaultNext = flow.next ?? routeNames[0] ?? null;

  if (flow.decide && output.length > 50 && routeNames.length > 0) {
    const routesList = routeNames.map(name => {
      const desc = routes[name];
      return `- "${name}" → ${desc || name}`;
    }).join('\n');

    const prompt = `You are a chain router. Analyze the agent output and decide which agent to route to next.

ROUTING RULES:
${flow.decide}

AVAILABLE ROUTES:
${routesList}
- "END" → Stop the chain (no next agent)

AGENT OUTPUT:
${output.substring(0, 2000)}

Based on the routing rules and output, which route should be taken?
Respond ONLY with JSON: {"route": "<agent-name or END>", "reason": "brief explanation"}`;

    try {
      const result = callHaiku(prompt);
      if (result && !result['error']) {
        const route = (result['route'] as string) || '';
        const reason = (result['reason'] as string) || 'AI decision';

        if (route === 'END' || route === 'end' || route === 'null') {
          return { next: null, reason: `[AI] ${reason}` };
        }

        if (routes[route]) {
          return { next: route, reason: `[AI] ${reason}` };
        }

        const matchedKey = routeNames.find(r => routes[r] === route);
        if (matchedKey) {
          return { next: matchedKey, reason: `[AI] ${reason}` };
        }
      }
    } catch {
    }
  }

  const outputLower = output.toLowerCase();
  const hasIssues = outputLower.includes('issues') ||
                    outputLower.includes('fail') ||
                    outputLower.includes('error') ||
                    outputLower.includes('bug');
  const hasPassed = outputLower.includes('pass') ||
                    outputLower.includes('approved') ||
                    outputLower.includes('success');

  if (hasIssues && !hasPassed) {
    if (flow.on_fail) {
      return { next: flow.on_fail, reason: 'Output indicates failure' };
    }
    if (flow.on_issues) {
      return { next: flow.on_issues, reason: 'Output indicates issues' };
    }
  }

  return { next: defaultNext, reason: 'Default next in flow' };
}

// ─── Phase Tracking ───────────────────────────────────────────────────────────

interface Phase {
  number: number;
  title: string;
  line: string;
  completed: boolean;
}

interface PhaseTracking {
  planFile: string;
  totalPhases: number;
  completedPhases: number;
  phases: Phase[];
}

function extractPhases(planContent: string): Phase[] {
  const phases: Phase[] = [];
  const lines = planContent.split('\n');

  const phaseRegex = /^##\s*(?:Phase|Step|Stage)\s*(\d+)[:\s-]*(.*)/i;
  const numberedRegex = /^##\s*(\d+)\.\s*(.*)/;
  const implPhaseRegex = /^###?\s*(?:Implementation\s+)?(?:Phase|Step)\s*(\d+)/i;

  for (const line of lines) {
    const match = line.match(phaseRegex) ?? line.match(numberedRegex) ?? line.match(implPhaseRegex);
    if (match) {
      phases.push({
        number: parseInt(match[1], 10),
        title: (match[2] ?? '').trim(),
        line,
        completed: false,
      });
    }
  }

  return phases;
}

function findRecentPlan(sessionId: string): string | null {
  const state = getState(sessionId);
  if (state?.phaseTracking) {
    const pt = state.phaseTracking as unknown as PhaseTracking;
    if (pt.planFile && existsSync(pt.planFile)) return pt.planFile;
  }

  if (!existsSync(PLANS_DIR)) return null;

  const files = readdirSync(PLANS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      path: join(PLANS_DIR, f),
      mtime: statSync(join(PLANS_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files[0]?.path ?? null;
}

function checkPhaseProgress(sessionId: string): { hasMore: boolean; allComplete?: boolean; currentPhase?: number; totalPhases?: number; nextPhase?: string; planFile?: string } {
  const rawState = getState(sessionId);
  const state = rawState as (typeof rawState & { phaseTracking?: PhaseTracking }) | null ?? {} as { phaseTracking?: PhaseTracking };

  let tracking = state.phaseTracking;
  if (!tracking) {
    const planFile = findRecentPlan(sessionId);
    if (!planFile) return { hasMore: false };

    try {
      const planContent = readFileSync(planFile, 'utf-8');
      const phases = extractPhases(planContent);
      if (phases.length <= 1) return { hasMore: false };

      tracking = {
        planFile,
        totalPhases: phases.length,
        completedPhases: 0,
        phases: phases.map(p => ({ ...p, completed: false })),
      };
      updateState(sessionId, { phaseTracking: tracking as unknown as Parameters<typeof updateState>[1]['phaseTracking'] });
    } catch {
      return { hasMore: false };
    }
  }

  tracking.completedPhases++;
  const current = tracking.completedPhases;
  const total = tracking.totalPhases;

  if (tracking.phases[current - 1]) {
    tracking.phases[current - 1].completed = true;
  }

  if (current < total) {
    updateState(sessionId, { phaseTracking: tracking as unknown as Parameters<typeof updateState>[1]['phaseTracking'] });
    const nextPhase = tracking.phases[current];
    return {
      hasMore: true,
      currentPhase: current,
      totalPhases: total,
      nextPhase: nextPhase?.title || `Phase ${current + 1}`,
      planFile: tracking.planFile,
    };
  }

  updateState(sessionId, { phaseTracking: undefined });
  return { hasMore: false, allComplete: true };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type ChainState = {
  previousAgents: Array<{ type: string; id: string; completedAt: string; outputSummary: string }>;
  currentAgent?: string | null;
  sharedContext?: Record<string, unknown>;
  phaseTracking?: Record<string, unknown>;
};

function main(): void {
  try {
    const stdin = readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin) as {
      tool_input?: { subagent_type?: string; prompt?: string; description?: string };
      tool_response?: {
        agentId?: string;
        totalTokens?: number;
        totalDurationMs?: number;
        totalToolUseCount?: number;
        content?: Array<{ type: string; text: string }>;
      };
      transcript_path?: string;
      session_id?: string;
      cwd?: string;
    };

    const type = p.tool_input?.subagent_type ?? 'agent';
    const id = p.tool_response?.agentId ?? '?';
    const tokens = p.tool_response?.totalTokens ?? 0;
    const ms = p.tool_response?.totalDurationMs ?? 0;
    const tools = p.tool_response?.totalToolUseCount ?? 0;
    const prompt = p.tool_input?.prompt ?? '';
    const description = p.tool_input?.description ?? '';
    const _transcriptPath = p.transcript_path ?? '';
    const sessionId = p.session_id ?? '';
    const cwd = p.cwd ?? process.cwd();
    void _transcriptPath;

    // Load chain config from cwd
    const config = loadChainConfig(cwd);

    // Extract response text
    let text = '';
    if (p.tool_response?.content) {
      for (const c of p.tool_response.content) {
        if (c.type === 'text') { text = c.text; break; }
      }
    }

    const hasActiveChain = config.flow && Object.keys(config.flow).length > 0;
    const agentInFlow = hasActiveChain && config.flow![type.toLowerCase()];

    if (!agentInFlow) {
      const secs = (ms / 1000).toFixed(1);
      const kTok = (tokens / 1000).toFixed(1);
      const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
      const noti = `Agent ${type} completed | ${secs}s | ${kTok}k tokens | ${tools} tools\n\n${preview}`;
      log(LOG_FILE, `\n[${new Date().toISOString()}] ${type}:${id} ${secs}s ${kTok}k → NO CHAIN\n`);

      // Save output for non-flow agents if in saveOutput list
      if (text && cwd && config.saveOutput?.includes(type.toLowerCase())) {
        try {
          const outputDir = join(cwd, '.claude', 'outputs', type.toLowerCase());
          if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
          const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
          const filename = `${ts}.md`;
          const header = `---\nagent: ${type}\nid: ${id}\ntokens: ${tokens}\nduration_ms: ${ms}\ntools: ${tools}\ntimestamp: ${new Date().toISOString()}\nsession: ${sessionId}\ndescription: "${description.replace(/"/g, '\\"')}"\n---\n\n`;
          const promptSection = prompt ? `## Prompt\n\n${prompt}\n\n## Output\n\n` : '';
          writeFileSync(join(outputDir, filename), header + promptSection + text);
          log(LOG_FILE, `[SAVE] ${type} → ${type.toLowerCase()}/${filename} (${text.length} chars)`);
        } catch { /* ignore */ }
      }

      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: noti,
        },
      }));
      process.exit(0);
    }

    // Detect backgrounded agents
    const isBackgrounded = tokens === 0 && ms === 0 && text.length === 0;
    if (isBackgrounded) {
      const dir = dirname(LOG_FILE);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      log(LOG_FILE, `\n[${new Date().toISOString()}] ${type}:${id} BACKGROUNDED (waiting)\n`);
      logEvent({ event: 'backgrounded', agent: type, id });

      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `<system-reminder>\n## BACKGROUND AGENT DETECTED\nAgent **${type}** was launched in background and returned empty.\n\n**You MUST wait for this agent to complete before proceeding.**\nDo NOT spawn new agents. Do NOT run commands. Do NOT skip ahead.\nThe chain will continue automatically when the agent finishes.\n</system-reminder>`,
        },
      }));
      process.exit(2);
    }

    // Get next agent from flow config
    const chainDecision = getNextAgent(type, text, config);
    let next: string | null = chainDecision.next;

    // Phase tracking for git-manager
    if (type.toLowerCase() === 'git-manager' && sessionId) {
      const progress = checkPhaseProgress(sessionId);
      if (progress.hasMore) {
        next = 'implementer';
        log(LOG_FILE, `[PHASE] ${progress.currentPhase}/${progress.totalPhases} → implementer: ${progress.nextPhase}\n`);
      } else if (progress.allComplete) {
        next = null;
        log(LOG_FILE, `[PHASE] All phases complete\n`);
      }
    }

    const currentFlow = config.flow?.[type.toLowerCase()];
    if (next && sessionId && currentFlow?.reset_counters === 'true') {
      const state = (getState(sessionId) ?? { previousAgents: [] }) as ChainState;
      state.previousAgents = (state.previousAgents ?? []).filter(a => a.type !== next);
      updateState(sessionId, state as Parameters<typeof updateState>[1]);
    }

    if (next && sessionId) {
      const state = (getState(sessionId) ?? { previousAgents: [] }) as ChainState;
      const nextAgentCount = (state.previousAgents ?? []).filter(a => a.type === next).length;

      if (MAX_AGENT_LOOPS > 0 && nextAgentCount >= MAX_AGENT_LOOPS) {
        log(LOG_FILE, `[LOOP BREAK] ${next} already ran ${nextAgentCount} times\n`);
        logEvent({ event: 'loop-break', agent: type, next, count: nextAgentCount, session: sessionId });

        console.log(JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `**Chain stopped** — **${next}** already ran ${nextAgentCount} times (max ${MAX_AGENT_LOOPS}). Review the output above and decide how to proceed.\n\n<system-reminder>\n## CHAIN LOOP DETECTED\nThe agent **${next}** has hit the maximum revision limit (${nextAgentCount}/${MAX_AGENT_LOOPS}).\nDo NOT spawn another agent. Report this to the user with a clear summary of what was accomplished and what still needs attention.\n</system-reminder>`,
          },
        }));
        process.exit(2);
      }
    }

    // Build notification
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    const secs = (ms / 1000).toFixed(1);
    const kTok = (tokens / 1000).toFixed(1);

    let noti = `Agent ${type} completed | ${secs}s | ${kTok}k tokens | ${tools} tools`;

    if (next) {
      const nextFlow = config.flow?.[next];
      if (nextFlow?.type === 'team' && nextFlow.teammates) {
        const teammates = nextFlow.teammates;
        const teamInstruction = teammates.map(t =>
          `- Teammate "${t.name}" using agent type "${t.agent}"${t.prompt ? `: ${t.prompt}` : ''}${t.model ? ` (model: ${t.model})` : ''}`
        ).join('\n');

        const routesList = nextFlow.routes
          ? Object.entries(nextFlow.routes).map(([agent, desc]) => `- "${agent}" → ${desc}`).join('\n')
          : '';

        noti += `

<system-reminder>
## MANDATORY NEXT STEP — AGENT TEAM
You MUST now create an agent team for the **${next}** step.

Create a team with these teammates:
${teamInstruction}

Each teammate should work in parallel. After all teammates complete, synthesize their results and continue the chain.

Use the TeamCreate tool to create the team with the above configuration.
${routesList ? `\nAfter the team completes, route based on:\n${routesList}` : ''}
${nextFlow.decide ? `\nRouting rules:\n${nextFlow.decide}` : ''}
DO NOT ask user. DO NOT skip. Wait for all teammates to finish before proceeding.
</system-reminder>`;
      } else {
        noti += `

<system-reminder>
## MANDATORY NEXT STEP
You MUST now spawn the **${next}** agent to continue the chain.

Command: Use Agent tool with subagent_type="${next}"

DO NOT ask user. DO NOT skip. DO NOT background agents.
</system-reminder>`;
      }
    } else {
      noti += `\n\nChain complete. No next agent.`;
    }

    noti += `\n\n${preview}`;

    // Log
    log(LOG_FILE, `\n[${new Date().toISOString()}] ${type}:${id} ${secs}s ${kTok}k → ${next ?? 'END'}\n`);
    logEvent({
      event: 'complete',
      agent: type,
      id,
      tokens,
      duration: ms,
      tools,
      next: next ?? null,
      reason: chainDecision.reason,
    });

    // Update state
    if (sessionId) {
      const state = (getState(sessionId) ?? { previousAgents: [] }) as ChainState;
      state.previousAgents = state.previousAgents ?? [];
      state.previousAgents.push({
        type,
        id,
        completedAt: new Date().toISOString(),
        outputSummary: preview.substring(0, 100),
      });
      state.currentAgent = next ?? null;
      updateState(sessionId, state as Parameters<typeof updateState>[1]);
    }

    // Save output if configured
    const flowNode = config.flow![type.toLowerCase()] as Record<string, unknown> | undefined;
    if (flowNode?.saveOutput === 'true' && text && cwd) {
      try {
        const outputDir = join(cwd, '.claude', 'outputs', type.toLowerCase());
        if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `${ts}.md`;
        const header = `---\nagent: ${type}\nid: ${id}\ntokens: ${tokens}\nduration_ms: ${ms}\ntools: ${tools}\ntimestamp: ${new Date().toISOString()}\nsession: ${sessionId}\nnext: ${next ?? 'END'}\ndescription: "${description.replace(/"/g, '\\"')}"\n---\n\n`;
        const promptSection = prompt ? `## Prompt\n\n${prompt}\n\n## Output\n\n` : '';
        writeFileSync(join(outputDir, filename), header + promptSection + text);
        log(LOG_FILE, `[SAVE] ${type} → ${type.toLowerCase()}/${filename} (${text.length} chars)`);
      } catch { /* ignore save failures */ }
    }

    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: noti,
      },
    }));
    process.exit(2);

  } catch (e: unknown) {
    console.error(`[post-agent] ${(e as Error).message}`);
    process.exit(0);
  }
}

main();
