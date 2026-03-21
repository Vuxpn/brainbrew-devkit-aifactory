import { readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { callHaiku } from '../ai/haiku.js';
import { getState, updateState } from '../utils/state.js';
import { log, logEvent } from '../utils/logger.js';
import { CHAIN_CONFIG_FILE, VERIFICATION_RULES_FILE, TMP_DIR } from '../utils/paths.js';

const LOG_FILE = join(TMP_DIR, 'agent-output.log');
const PLANS_DIR = join(homedir(), '.claude', 'plans');
const MAX_AGENT_LOOPS = 3; // Max times same agent can run in one session

// ─── Config ──────────────────────────────────────────────────────────────────

interface AgentConfig {
  chainNext?: string | null;
  instructions?: string;
}

interface ChainConfig {
  agents: Record<string, AgentConfig>;
}

let CONFIG: ChainConfig = { agents: {} };
try {
  CONFIG = JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8')) as ChainConfig;
} catch {
  try {
    const oldRules = JSON.parse(readFileSync(VERIFICATION_RULES_FILE, 'utf-8')) as Record<string, { chainNext?: string }>;
    for (const [type, rule] of Object.entries(oldRules)) {
      CONFIG.agents[type] = { chainNext: rule.chainNext };
    }
  } catch { /* no config */ }
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

interface PhaseProgress {
  hasMore: boolean;
  allComplete?: boolean;
  currentPhase?: number;
  totalPhases?: number;
  nextPhase?: string;
  planFile?: string;
}

interface PhaseInfo {
  completedPhases: number;
  totalPhases: number;
  remainingPhases: number;
  phases: Phase[];
  planFile: string;
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
    // phaseTracking.planFile lives in state
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

function initPhaseTracking(sessionId: string): PhaseTracking | null {
  const planFile = findRecentPlan(sessionId);
  if (!planFile) return null;

  try {
    const planContent = readFileSync(planFile, 'utf-8');
    const phases = extractPhases(planContent);
    if (phases.length <= 1) return null;

    return {
      planFile,
      totalPhases: phases.length,
      completedPhases: 0,
      phases: phases.map(p => ({ ...p, completed: false })),
    };
  } catch {
    return null;
  }
}

function checkPhaseProgress(sessionId: string): PhaseProgress {
  const rawState = getState(sessionId);
  const state = rawState as (typeof rawState & { phaseTracking?: PhaseTracking }) | null ?? {} as { phaseTracking?: PhaseTracking };

  let tracking = state.phaseTracking;
  if (!tracking) {
    const init = initPhaseTracking(sessionId);
    if (!init) return { hasMore: false };

    tracking = init;
    updateState(sessionId, { phaseTracking: tracking as unknown as Parameters<typeof updateState>[1]['phaseTracking'] });
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

  // All phases done — clear phaseTracking
  updateState(sessionId, { phaseTracking: undefined });
  return { hasMore: false, allComplete: true };
}

function getPhaseInfo(sessionId: string): PhaseInfo | null {
  const state = getState(sessionId) as (ReturnType<typeof getState> & { phaseTracking?: PhaseTracking }) | null;
  const tracking = state?.phaseTracking;
  if (!tracking) return null;

  return {
    completedPhases: tracking.completedPhases,
    totalPhases: tracking.totalPhases,
    remainingPhases: tracking.totalPhases - tracking.completedPhases,
    phases: tracking.phases,
    planFile: tracking.planFile,
  };
}

// ─── Chain Decider ────────────────────────────────────────────────────────────

interface ChainDecision {
  next: string | null;
  reason: string;
}

function decideNextAgent(agentType: string, output: string, defaultNext: string | null | undefined): ChainDecision {
  if (!output || output.length < 50) {
    return { next: defaultNext ?? null, reason: 'Output too short, using default' };
  }

  const prompt = `Analyze this ${agentType} agent output and decide the next agent in the workflow.

CURRENT AGENT: ${agentType}
DEFAULT NEXT: ${defaultNext ?? 'none'}

CHAIN RULES:
- tester: if tests PASS → git-manager (commit), if FAIL/BUGS → debugger (fix)
- code-reviewer: if APPROVED (no HIGH/MEDIUM issues) → tester, if ANY issues (HIGH/MEDIUM/mismatch/bug/fix needed) → implementer (fix)
- plan-reviewer: if APPROVED → implementer, if ISSUES → planner (revise)
- debugger: after fix → implementer (apply fix)
- implementer: → code-reviewer
- git-manager: if "Remaining" phases listed → implementer (next phase), if "None" or no phases → null (end)

IMPORTANT: For code-reviewer, if the output mentions ANY bug, mismatch, missing field, wrong name, or needed fix — even if some checks pass — the verdict is ISSUES → implementer. Only route to tester if EVERYTHING is clean with zero issues found.

AGENT OUTPUT:
${output}

Based on the output, what should be the next agent?
Respond ONLY with JSON:
{"next": "agent-name or null", "reason": "brief explanation"}`;

  try {
    const result = callHaiku(prompt);
    if (result['error']) {
      return { next: defaultNext ?? null, reason: 'AI error, using default' };
    }
    return {
      next: (result['next'] as string | null) ?? null,
      reason: (result['reason'] as string) || 'AI decision',
    };
  } catch {
    return { next: defaultNext ?? null, reason: 'Error, using default' };
  }
}

// ─── Type helper ─────────────────────────────────────────────────────────────

// Re-use the state type structure locally
type ChainState = {
  previousAgents: Array<{ type: string; id: string; completedAt: string; outputSummary: string }>;
  currentAgent?: string | null;
  sharedContext?: Record<string, unknown>;
  phaseTracking?: Record<string, unknown>;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  try {
    const stdin = readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin) as {
      tool_input?: { subagent_type?: string };
      tool_response?: {
        agentId?: string;
        totalTokens?: number;
        totalDurationMs?: number;
        totalToolUseCount?: number;
        content?: Array<{ type: string; text: string }>;
      };
      transcript_path?: string;
      session_id?: string;
    };

    const type = p.tool_input?.subagent_type ?? 'agent';
    const id = p.tool_response?.agentId ?? '?';
    const tokens = p.tool_response?.totalTokens ?? 0;
    const ms = p.tool_response?.totalDurationMs ?? 0;
    const tools = p.tool_response?.totalToolUseCount ?? 0;
    const transcriptPath = p.transcript_path ?? '';
    const sessionId = p.session_id ?? '';

    // Extract response text
    let text = '';
    if (p.tool_response?.content) {
      for (const c of p.tool_response.content) {
        if (c.type === 'text') { text = c.text; break; }
      }
    }

    // Detect backgrounded agents (0 tokens, 0 duration, no text)
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

    const agentConfig = CONFIG.agents[type.toLowerCase()];
    let next: string | null | undefined = agentConfig?.chainNext;

    // Phase tracking for git-manager
    let chainDecision: ChainDecision | null = null;
    if (type.toLowerCase() === 'git-manager' && sessionId) {
      const progress = checkPhaseProgress(sessionId);
      if (progress.hasMore) {
        next = 'implementer';
        chainDecision = {
          next: 'implementer',
          reason: `Phase ${progress.currentPhase}/${progress.totalPhases} committed. Next: "${progress.nextPhase}" (from ${progress.planFile})`,
        };
        log(LOG_FILE, `[PHASE] ${progress.currentPhase}/${progress.totalPhases} → implementer: ${progress.nextPhase}\n`);
      } else if (progress.allComplete) {
        next = null;
        chainDecision = { next: null, reason: `All ${progress.totalPhases ?? ''} phases complete` };
        log(LOG_FILE, `[PHASE] All phases complete\n`);
      } else {
        chainDecision = decideNextAgent(type, text, next);
        if (chainDecision.next !== next) {
          next = chainDecision.next;
          log(LOG_FILE, `[CHAIN] ${type} → ${next} (${chainDecision.reason})\n`);
        }
      }
    }

    // AI-based chain decision for conditional agents
    const conditionalAgents = ['tester', 'code-reviewer', 'plan-reviewer'];
    if (!chainDecision && conditionalAgents.includes(type.toLowerCase())) {
      chainDecision = decideNextAgent(type, text, next);
      if (chainDecision.next !== next) {
        next = chainDecision.next;
        log(LOG_FILE, `[CHAIN] ${type} → ${next} (${chainDecision.reason})\n`);
      }
    }

    // ── Loop Protection ──────────────────────────────────────────────────────
    // Count how many times the next agent has already run in this session.
    // If exceeded, stop the chain and report to user.
    if (next && sessionId) {
      const state = (getState(sessionId) ?? { previousAgents: [] }) as ChainState;
      const nextAgentCount = (state.previousAgents ?? []).filter(
        (a) => a.type === next
      ).length;

      if (nextAgentCount >= MAX_AGENT_LOOPS) {
        log(LOG_FILE, `[LOOP BREAK] ${next} already ran ${nextAgentCount} times — stopping chain\n`);
        logEvent({ event: 'loop-break', agent: type, next, count: nextAgentCount, session: sessionId });

        const loopNoti = `Agent ${type} completed | Chain stopped — **${next}** already ran ${nextAgentCount} times this session (max ${MAX_AGENT_LOOPS}).

<system-reminder>
## CHAIN LOOP DETECTED — STOPPED
Agent **${next}** has been called ${nextAgentCount} times. This likely means there's a recurring issue that agents cannot resolve automatically.

**Do NOT spawn another agent.** Report the situation to the user and ask for guidance.

Summary of loop: ${(state.previousAgents ?? []).filter(a => a.type === next).map(a => a.outputSummary).join(' → ')}
</system-reminder>`;

        console.log(JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: loopNoti,
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

    if (chainDecision && chainDecision.next !== agentConfig?.chainNext) {
      noti += `\n\n## CHAIN REDIRECTED: ${chainDecision.reason}`;
    }

    if (next) {
      let phaseContext = '';
      if (type.toLowerCase() === 'git-manager' && next === 'implementer' && sessionId) {
        const info = getPhaseInfo(sessionId);
        if (info) {
          phaseContext = `\nPhase Progress: ${info.completedPhases}/${info.totalPhases} done, ${info.remainingPhases} remaining.\nPlan file: ${info.planFile}\nImplement the NEXT phase only.`;
        }
      }

      noti += `

<system-reminder>
## MANDATORY NEXT STEP
You MUST now spawn the **${next}** agent to continue the chain.

Command: Use Agent tool with subagent_type="${next}"${phaseContext}

DO NOT ask user. DO NOT skip. DO NOT background agents. This is required to complete the workflow.
</system-reminder>`;
    }

    noti += `\n\nContext: ${transcriptPath}`;
    noti += `\n${preview}`;

    // Log
    log(LOG_FILE, `\n[${new Date().toISOString()}] ${type}:${id} ${secs}s ${kTok}k\n`);
    logEvent({
      event: 'complete',
      agent: type,
      id,
      tokens,
      duration: ms,
      tools,
      next: next ?? null,
      chainDecision: chainDecision?.reason ?? null,
    });

    // Update shared state
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
