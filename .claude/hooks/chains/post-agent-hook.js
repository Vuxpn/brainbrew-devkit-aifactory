#!/usr/bin/env node

/**
 * PostToolUse[Agent] Hook - Display agent output & chain workflow
 *
 * Supports multi-phase plans: after git-manager, checks if more phases remain
 * and chains back to implementer if needed.
 */

const fs = require('fs');
const path = require('path');
const { logEvent, updateState, getState } = require('./chain-utils');
const { checkPhaseProgress } = require('./phase-tracker');

const CONFIG_FILE = path.join(__dirname, 'chain-config.json');
const RULES_FILE = path.join(__dirname, 'verification-rules.json');
const LOG_FILE = path.join(process.env.HOME, '.claude', 'tmp', 'agent-output.log');

// Load chain config (new format first, fallback to old)
let CONFIG = { agents: {} };
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (e) {
  try {
    const oldRules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    for (const [type, rule] of Object.entries(oldRules)) {
      CONFIG.agents[type] = { chainNext: rule.chainNext };
    }
  } catch (e2) {}
}

function log(entry) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin);
    const type = p.tool_input?.subagent_type || 'agent';
    const id = p.tool_response?.agentId || '?';
    const tokens = p.tool_response?.totalTokens || 0;
    const ms = p.tool_response?.totalDurationMs || 0;
    const tools = p.tool_response?.totalToolUseCount || 0;
    const transcriptPath = p.transcript_path || '';
    const sessionId = p.session_id || '';

    // Get response text
    let text = '';
    if (p.tool_response?.content) {
      for (const c of p.tool_response.content) {
        if (c.type === 'text') { text = c.text; break; }
      }
    }

    // Get chain next from config
    const agentConfig = CONFIG.agents[type.toLowerCase()];
    let next = agentConfig?.chainNext;

    // Multi-phase support: after git-manager, check if more phases remain
    let phaseInfo = null;
    if (type.toLowerCase() === 'git-manager' && sessionId) {
      phaseInfo = checkPhaseProgress(sessionId, text);
      if (phaseInfo.hasMore) {
        next = 'implementer'; // Chain back to implementer for next phase
      }
    }

    // Build compact notification
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
    const secs = (ms / 1000).toFixed(1);
    const kTok = (tokens / 1000).toFixed(1);

    let noti = `Agent ${type} completed | ${secs}s | ${kTok}k tokens | ${tools} tools`;

    // Add phase progress info
    if (phaseInfo?.hasMore) {
      noti += `\n\n## PHASE PROGRESS: ${phaseInfo.currentPhase}/${phaseInfo.totalPhases} completed`;
      noti += `\nNext: **${phaseInfo.nextPhase}**`;
      noti += `\nPlan: ${phaseInfo.planFile}`;
    } else if (phaseInfo?.allComplete) {
      noti += `\n\n## ALL PHASES COMPLETE`;
    }

    if (next) {
      // Wrap mandatory instructions in system-reminder for higher compliance
      noti += `

<system-reminder>
## MANDATORY NEXT STEP
You MUST now spawn the **${next}** agent to continue the chain.`;

      if (phaseInfo?.hasMore) {
        noti += `
Focus on: **${phaseInfo.nextPhase}** (Phase ${phaseInfo.currentPhase + 1} of ${phaseInfo.totalPhases})
Read the plan file and implement ONLY the next phase.`;
      }

      noti += `

Command: Use Agent tool with subagent_type="${next}"

DO NOT ask user. DO NOT skip. This is required to complete the workflow.
</system-reminder>`;
    }

    noti += `\n\nContext: ${transcriptPath}`;
    noti += `\n${preview}`;

    // Log to both old format and unified JSONL
    log(`\n[${new Date().toISOString()}] ${type}:${id} ${secs}s ${kTok}k\n`);
    logEvent({
      event: 'complete',
      agent: type,
      id,
      tokens,
      duration: ms,
      tools,
      next: next || null,
      phase: phaseInfo?.currentPhase || null,
      totalPhases: phaseInfo?.totalPhases || null
    });

    // Update shared state with completion info
    if (sessionId) {
      const state = getState(sessionId) || { sessionId, previousAgents: [] };
      const agentRecord = {
        type,
        id,
        completedAt: new Date().toISOString(),
        outputSummary: preview.substring(0, 100)
      };
      state.previousAgents = state.previousAgents || [];
      state.previousAgents.push(agentRecord);
      state.currentAgent = next || null;
      updateState(sessionId, state);
    }

    // Output
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: noti
      }
    }));
    process.exit(2);

  } catch (e) {
    console.error(`[post-agent] ${e.message}`);
    process.exit(0);
  }
}

main();
