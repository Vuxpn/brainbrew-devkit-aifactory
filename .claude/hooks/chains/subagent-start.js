#!/usr/bin/env node

/**
 * SubagentStart Hook - Inject context into subagents when they spawn
 *
 * Provides:
 * - Main session transcript path (for querying parent context)
 * - Chain workflow instructions
 * - Agent-specific guidelines
 */

const fs = require('fs');
const path = require('path');
const { logEvent, getState } = require('./chain-utils');

const CONFIG_FILE = path.join(__dirname, 'chain-config.json');
const RULES_FILE = path.join(__dirname, 'verification-rules.json');
const LOG_FILE = path.join(process.env.HOME, '.claude', 'tmp', 'subagent-start.log');

// Load chain config (new format first, fallback to old)
let CONFIG = { agents: {} };
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (e) {
  // Fallback to old rules format
  try {
    const oldRules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    // Convert old format to new
    for (const [type, rule] of Object.entries(oldRules)) {
      CONFIG.agents[type] = { chainNext: rule.chainNext };
    }
  } catch (e2) {}
}

function getAgentConfig(type) {
  return CONFIG.agents[type.toLowerCase()] || {};
}

function log(msg) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin);
    const type = p.agent_type || '';
    const id = p.agent_id || '';
    const transcriptPath = p.transcript_path || '';
    const sessionId = p.session_id || '';

    log(`START ${type}:${id}`);
    logEvent({ event: 'start', agent: type, id, session: sessionId });

    // Build context injection from config
    const agentConfig = getAgentConfig(type);
    const chainNext = agentConfig.chainNext;
    const instructions = agentConfig.instructions || '';

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

    // Inject shared state from previous agents
    const state = getState(sessionId);
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
- Summary: ${prev.outputSummary || 'N/A'}
- Output: ${prev.outputPath || 'N/A'}
`;
    }

    // Output - wrap in system-reminder for higher compliance
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SubagentStart",
        additionalContext: `<system-reminder>\n${context.trim()}\n</system-reminder>`
      }
    }));

    process.exit(0);

  } catch (e) {
    console.error(`[subagent-start] ${e.message}`);
    process.exit(0);
  }
}

main();
