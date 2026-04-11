import { readFileSync } from 'fs';
import { getState, updateState } from '../utils/state.js';
import { log, logEvent } from '../utils/logger.js';
import { CHAIN_CONFIG_FILE, VERIFICATION_RULES_FILE, TMP_DIR } from '../utils/paths.js';
import { readActiveChainContent } from '../utils/chain-resolver.js';
import { join } from 'path';

const LOG_FILE = join(TMP_DIR, 'subagent-start.log');


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

function getAgentConfig(type: string): AgentConfig {
  return CONFIG.agents[type.toLowerCase()] ?? {};
}


function parseFlowContext(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  let currentAgent = '';
  let inContext = false;
  let contextLines: string[] = [];
  let contextIndent = 0;

  for (const line of content.split('\n')) {
    const agentMatch = line.match(/^  (\S+):$/);
    if (agentMatch) {
      if (currentAgent && contextLines.length > 0) {
        result[currentAgent] = contextLines.join('\n').trim();
      }
      currentAgent = agentMatch[1];
      inContext = false;
      contextLines = [];
      continue;
    }

    if (currentAgent) {
      const contextStart = line.match(/^    context:\s*\|?\s*$/);
      if (contextStart) {
        inContext = true;
        contextIndent = 0;
        continue;
      }

      const inlineContext = line.match(/^    context:\s*(.+)/);
      if (inlineContext) {
        result[currentAgent] = inlineContext[1].trim();
        inContext = false;
        continue;
      }

      if (inContext) {
        const lineIndent = line.search(/\S|$/);
        if (lineIndent > 4 || line.trim() === '') {
          if (contextIndent === 0 && line.trim()) contextIndent = lineIndent;
          contextLines.push(line.substring(Math.min(contextIndent, lineIndent)));
        } else {
          result[currentAgent] = contextLines.join('\n').trim();
          inContext = false;
          contextLines = [];
        }
      }
    }
  }

  if (currentAgent && contextLines.length > 0) {
    result[currentAgent] = contextLines.join('\n').trim();
  }

  return result;
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
      cwd?: string;
    };

    const type = p.agent_type ?? '';
    const id = p.agent_id ?? '';
    const transcriptPath = p.transcript_path ?? '';
    const sessionId = p.session_id ?? '';

    log(LOG_FILE, `START ${type}:${id}`);
    logEvent({ event: 'start', agent: type, id, session: sessionId });

    if (sessionId) {
      const currentState = getState(sessionId);
      if (currentState?.currentAgent && currentState.currentAgent === type.toLowerCase()) {
        updateState(sessionId, { currentAgent: undefined, chainBlockCount: 0 });
      }
    }

    const agentConfig = getAgentConfig(type);
    const chainNext = agentConfig.chainNext;
    const instructions = agentConfig.instructions ?? '';

    let context = `
## Context
- Main Session: ${transcriptPath}
- Session ID: ${sessionId}
- You can read the main transcript to understand parent context if needed.
`;

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

    const cwd = p.cwd ?? process.cwd();
    try {
      const chainContent = readActiveChainContent(cwd);
      if (chainContent) {
        const config = parseFlowContext(chainContent);
        const nodeContext = config[type.toLowerCase()];
        if (nodeContext) {
          context += `\n## Chain Instructions\n${nodeContext}\n`;
          log(LOG_FILE, `[CONTEXT] Injected chain context for ${type} (${nodeContext.length} chars)`);
        }
      }
    } catch (e) {
      log(LOG_FILE, `[CONTEXT] Error: ${(e as Error).message}`);
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
