import { readFileSync } from 'fs';
import { getState, updateState } from '../utils/state.js';
import { log, logEvent } from '../utils/logger.js';
import { CHAIN_CONFIG_FILE, VERIFICATION_RULES_FILE, TMP_DIR } from '../utils/paths.js';
import { subscribe, formatForContext } from '../memory/bus.js';
import { join } from 'path';
import { createWorktree, initWorktreeSupport } from '../utils/worktree.js';

const LOG_FILE = join(TMP_DIR, 'subagent-start.log');

interface AgentConfig {
  chainNext?: string | null;
  instructions?: string;
  isolation?: 'worktree' | 'none';
}

interface ChainConfig {
  agents: Record<string, AgentConfig>;
  isolation?: {
    enabled: boolean;
    method: 'worktree' | 'none';
    autoCommit: boolean;
    requireReview: boolean;
    cleanupOnSessionEnd: boolean;
  };
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

function getAgentConfig(type: string): AgentConfig {
  return CONFIG.agents[type.toLowerCase()] ?? {};
}

function shouldUseWorktree(type: string): boolean {
  const agentConfig = getAgentConfig(type);
  const globalIsolation = CONFIG.isolation;

  if (globalIsolation?.enabled === false) return false;

  if (agentConfig.isolation === 'worktree') return true;
  if (agentConfig.isolation === 'none') return false;

  return globalIsolation?.method === 'worktree' || false;
}

function main(): void {
  try {
    const stdin = readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin) as {
      agent_type?: string;
      agent_id?: string;
      transcript_path?: string;
      session_id?: string;
    };

    const type = p.agent_type ?? '';
    const id = p.agent_id ?? '';
    const transcriptPath = p.transcript_path ?? '';
    const sessionId = p.session_id ?? '';

    log(LOG_FILE, `START ${type}:${id}`);
    logEvent({ event: 'start', agent: type, id, session: sessionId });

    const agentConfig = getAgentConfig(type);
    const chainNext = agentConfig.chainNext;
    const instructions = agentConfig.instructions ?? '';

    let context = `
## Context
- Main Session: ${transcriptPath}
- Session ID: ${sessionId}
- You can read the main transcript to understand parent context if needed.
`;

    const useWorktree = shouldUseWorktree(type);

    if (useWorktree) {
      initWorktreeSupport();

      try {
        const worktree = createWorktree(type, id);

        const state = getState(sessionId) ?? {};
        updateState(sessionId, {
          ...state,
          worktree: {
            path: worktree.path,
            branch: worktree.branch,
            agentId: id,
            agentType: type,
            createdAt: new Date().toISOString(),
          },
        });

        context += `
## Worktree Isolation (ACTIVE)
You are working in an **isolated git worktree**:
- **Path**: \`${worktree.path}\`
- **Branch**: \`${worktree.branch}\`

### Requirements
1. All file changes must be made in this worktree
2. You MUST commit your changes before finishing: \`git add -A && git commit -m "message"\`
3. After commit, the worktree will be available for review
4. Changes will NOT affect the main codebase until merged

### Commands
- Check status: \`git status\`
- Stage all: \`git add -A\`
- Commit: \`git commit -m "your message"\`
- View diff: \`git diff HEAD\`
`;

        log(LOG_FILE, `[WORKTREE] Created ${worktree.path} (${worktree.branch})`);
        logEvent({
          event: 'worktree-created',
          agent: type,
          id,
          path: worktree.path,
          branch: worktree.branch,
        });
      } catch (e) {
        log(LOG_FILE, `[WORKTREE] Failed to create: ${(e as Error).message}`);
        context += `
## Worktree Warning
Failed to create isolated worktree. Proceeding without isolation.
`;
      }
    }

    if (chainNext) {
      context += `
## Chain Workflow
After completing this task, the next agent should be: **${chainNext}**
Ensure your output is complete enough for the next agent to proceed.
`;
    }

    if (instructions) {
      context += instructions;
    }

    if (type.toLowerCase() === 'git-manager') {
      context += `
## Phase Reporting (REQUIRED)
After committing, check for a plan file in the project's plans/ directory.
If found, report phase status in your output:

### Phase Status
- **Committed**: [Phase name/number you just committed]
- **Remaining**: [List remaining phases, or "None" if all complete]

This helps the workflow decide if more implementation is needed.
`;
    }

    const state = getState(sessionId);

    try {
      const { messages, consumed } = subscribe(type, {
        sessionId,
        chainId: (state as Record<string, unknown> | null)?.currentChain as string | undefined,
        cwd: process.cwd(),
      });

      if (messages.length > 0) {
        const busContext = formatForContext(messages);
        context += `\n${busContext}\n`;
        log(LOG_FILE, `[BUS] Injected ${messages.length} messages (consumed: ${consumed})`);
      }
    } catch (e) {
      log(LOG_FILE, `[BUS] Error: ${(e as Error).message}`);
    }

    if (state?.activeTeam) {
      const team = state.activeTeam as { name: string; teammates: Array<{ name: string; agent: string; status: string }> };
      const myTeammate = team.teammates.find(t => t.agent === type.toLowerCase());
      if (myTeammate) {
        context += `
## Team Context
You are part of the **${team.name}** team.
Your role: **${myTeammate.name}**
Other teammates: ${team.teammates.filter(t => t.name !== myTeammate.name).map(t => t.name).join(', ')}

Focus on your specific review area. Your output will be combined with other teammates' results.
`;
      }
    }

    if (state?.sharedContext) {
      context += `
## Shared Context from Previous Agents
${JSON.stringify(state.sharedContext, null, 2)}
`;
    }
    if (state?.previousAgents?.length) {
      const prev = state.previousAgents[state.previousAgents.length - 1];
      context += `
## Previous Agent Output
- Agent: ${prev.type}
- Summary: ${prev.outputSummary ?? 'N/A'}
- Output: ${(prev as { outputPath?: string }).outputPath ?? 'N/A'}
`;
    }

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `<system-reminder>\n${context.trim()}\n</system-reminder>`,
      },
    }));

    process.exit(0);

  } catch (e: unknown) {
    console.error(`[subagent-start] ${(e as Error).message}`);
    process.exit(0);
  }
}

main();
