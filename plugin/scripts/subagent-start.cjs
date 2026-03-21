"use strict";

// src/hooks/subagent-start.ts
var import_fs3 = require("fs");

// src/utils/state.ts
var import_fs = require("fs");
var import_path2 = require("path");

// src/utils/paths.ts
var import_os = require("os");
var import_path = require("path");
var HOME = (0, import_os.homedir)();
var PLUGIN_ROOT = (0, import_path.resolve)(__dirname, "..");
var CLAUDE_DIR = (0, import_path.join)(HOME, ".claude");
var CHAINS_DIR = PLUGIN_ROOT;
var BACKUP_DIR = (0, import_path.join)(CHAINS_DIR, ".backup");
var AGENTS_DIR = (0, import_path.join)(PLUGIN_ROOT, "agents");
var SKILLS_DIR = (0, import_path.join)(PLUGIN_ROOT, "skills");
var HOOKS_DIR = (0, import_path.join)(PLUGIN_ROOT, "config");
var TMP_DIR = (0, import_path.join)(HOME, ".claude", "tmp");
var SETTINGS_FILE = (0, import_path.join)(HOME, ".claude", "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path.join)(PLUGIN_ROOT, "config", "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path.join)(PLUGIN_ROOT, "config", "verification-rules.json");
var CHAIN_EVENTS_LOG = (0, import_path.join)(TMP_DIR, "chain-events.jsonl");

// src/utils/state.ts
var STATE_DIR = (0, import_path2.join)(TMP_DIR, "chain-state");
function statePath(sessionId) {
  return (0, import_path2.join)(STATE_DIR, `${sessionId}.json`);
}
function getState(sessionId) {
  if (!sessionId) return null;
  const file = statePath(sessionId);
  if (!(0, import_fs.existsSync)(file)) return null;
  try {
    return JSON.parse((0, import_fs.readFileSync)(file, "utf-8"));
  } catch {
    return null;
  }
}

// src/utils/logger.ts
var import_fs2 = require("fs");
var import_path3 = require("path");
function log(file, msg) {
  const dir = (0, import_path3.dirname)(file);
  if (!(0, import_fs2.existsSync)(dir)) (0, import_fs2.mkdirSync)(dir, { recursive: true });
  (0, import_fs2.appendFileSync)(file, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`);
}
function logEvent(data) {
  const dir = (0, import_path3.dirname)(CHAIN_EVENTS_LOG);
  if (!(0, import_fs2.existsSync)(dir)) (0, import_fs2.mkdirSync)(dir, { recursive: true });
  const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), ...data };
  (0, import_fs2.appendFileSync)(CHAIN_EVENTS_LOG, JSON.stringify(entry) + "\n");
}

// src/hooks/subagent-start.ts
var import_path4 = require("path");
var LOG_FILE = (0, import_path4.join)(TMP_DIR, "subagent-start.log");
var CONFIG = { agents: {} };
try {
  CONFIG = JSON.parse((0, import_fs3.readFileSync)(CHAIN_CONFIG_FILE, "utf-8"));
} catch {
  try {
    const oldRules = JSON.parse((0, import_fs3.readFileSync)(VERIFICATION_RULES_FILE, "utf-8"));
    for (const [type, rule] of Object.entries(oldRules)) {
      CONFIG.agents[type] = { chainNext: rule.chainNext };
    }
  } catch {
  }
}
function getAgentConfig(type) {
  return CONFIG.agents[type.toLowerCase()] ?? {};
}
function main() {
  try {
    const stdin = (0, import_fs3.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const type = p.agent_type ?? "";
    const id = p.agent_id ?? "";
    const transcriptPath = p.transcript_path ?? "";
    const sessionId = p.session_id ?? "";
    log(LOG_FILE, `START ${type}:${id}`);
    logEvent({ event: "start", agent: type, id, session: sessionId });
    const agentConfig = getAgentConfig(type);
    const chainNext = agentConfig.chainNext;
    const instructions = agentConfig.instructions ?? "";
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
    if (type.toLowerCase() === "git-manager") {
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
- Summary: ${prev.outputSummary ?? "N/A"}
- Output: ${prev.outputPath ?? "N/A"}
`;
    }
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SubagentStart",
        additionalContext: `<system-reminder>
${context.trim()}
</system-reminder>`
      }
    }));
    process.exit(0);
  } catch (e) {
    console.error(`[subagent-start] ${e.message}`);
    process.exit(0);
  }
}
main();
