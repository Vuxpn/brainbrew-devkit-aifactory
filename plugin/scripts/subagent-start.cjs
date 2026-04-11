"use strict";

// src/hooks/subagent-start.ts
var import_fs4 = require("fs");

// src/utils/state.ts
var import_fs = require("fs");
var import_path2 = require("path");

// src/utils/paths.ts
var import_os = require("os");
var import_path = require("path");
var HOME = (0, import_os.homedir)();
var CLAUDE_DIR = (0, import_path.join)(HOME, ".claude");
var CHAINS_DIR = (0, import_path.join)(CLAUDE_DIR, "chains");
var BACKUP_DIR = (0, import_path.join)(CHAINS_DIR, ".backup");
var AGENTS_DIR = (0, import_path.join)(CLAUDE_DIR, "agents");
var SKILLS_DIR = (0, import_path.join)(CLAUDE_DIR, "skills");
var HOOKS_DIR = (0, import_path.join)(CLAUDE_DIR, "hooks", "chains");
var CUSTOM_HOOKS_DIR = (0, import_path.join)(HOOKS_DIR, "custom");
var TMP_DIR = (0, import_path.join)(CLAUDE_DIR, "tmp");
var PROJECTS_DIR = (0, import_path.join)(CLAUDE_DIR, "projects");
var SETTINGS_FILE = (0, import_path.join)(CLAUDE_DIR, "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path.join)(HOOKS_DIR, "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path.join)(HOOKS_DIR, "verification-rules.json");
var HOOKS_CONFIG_FILE = (0, import_path.join)(HOOKS_DIR, "hooks-config.yaml");
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
function updateState(sessionId, updates) {
  if (!sessionId) return;
  if (!(0, import_fs.existsSync)(STATE_DIR)) (0, import_fs.mkdirSync)(STATE_DIR, { recursive: true });
  const current = getState(sessionId) || { previousAgents: [] };
  const merged = { ...current, ...updates };
  (0, import_fs.writeFileSync)(statePath(sessionId), JSON.stringify(merged, null, 2));
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

// src/utils/chain-resolver.ts
var import_fs3 = require("fs");
var import_path4 = require("path");
function resolveActiveChain(cwd) {
  const pointerPath = (0, import_path4.join)(cwd, ".claude", "chain-config.yaml");
  if (!(0, import_fs3.existsSync)(pointerPath)) return null;
  const content = (0, import_fs3.readFileSync)(pointerPath, "utf-8");
  if (/^(flow|hooks):/m.test(content)) {
    return { configPath: pointerPath, chainName: "default", isLegacy: true };
  }
  const activeMatch = content.match(/^active:\s*(.+)/m);
  if (!activeMatch) return null;
  const active = activeMatch[1].trim();
  const dirMatch = content.match(/^chains_dir:\s*(.+)/m);
  const chainsDir = dirMatch ? dirMatch[1].trim() : ".claude/chains/";
  if (active.includes("..") || chainsDir.includes("..")) return null;
  const chainPath = (0, import_path4.join)(cwd, chainsDir, `${active}.yaml`);
  const resolvedPath = (0, import_path4.resolve)(chainPath);
  const expectedBase = (0, import_path4.resolve)((0, import_path4.join)(cwd, ".claude"));
  if (!resolvedPath.startsWith(expectedBase)) return null;
  if (!(0, import_fs3.existsSync)(chainPath)) return null;
  return { configPath: chainPath, chainName: active, isLegacy: false };
}
function readActiveChainContent(cwd) {
  const resolved = resolveActiveChain(cwd);
  if (!resolved) return null;
  return (0, import_fs3.readFileSync)(resolved.configPath, "utf-8");
}

// src/hooks/subagent-start.ts
var import_path5 = require("path");
var LOG_FILE = (0, import_path5.join)(TMP_DIR, "subagent-start.log");
var CONFIG = { agents: {} };
try {
  CONFIG = JSON.parse((0, import_fs4.readFileSync)(CHAIN_CONFIG_FILE, "utf-8"));
} catch {
  try {
    const oldRules = JSON.parse((0, import_fs4.readFileSync)(VERIFICATION_RULES_FILE, "utf-8"));
    for (const [type, rule] of Object.entries(oldRules)) {
      CONFIG.agents[type] = { chainNext: rule.chainNext };
    }
  } catch {
  }
}
function getAgentConfig(type) {
  return CONFIG.agents[type.toLowerCase()] ?? {};
}
function parseFlowContext(content) {
  const result = {};
  let currentAgent = "";
  let inContext = false;
  let contextLines = [];
  let contextIndent = 0;
  for (const line of content.split("\n")) {
    const agentMatch = line.match(/^  (\S+):$/);
    if (agentMatch) {
      if (currentAgent && contextLines.length > 0) {
        result[currentAgent] = contextLines.join("\n").trim();
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
        if (lineIndent > 4 || line.trim() === "") {
          if (contextIndent === 0 && line.trim()) contextIndent = lineIndent;
          contextLines.push(line.substring(Math.min(contextIndent, lineIndent)));
        } else {
          result[currentAgent] = contextLines.join("\n").trim();
          inContext = false;
          contextLines = [];
        }
      }
    }
  }
  if (currentAgent && contextLines.length > 0) {
    result[currentAgent] = contextLines.join("\n").trim();
  }
  return result;
}
function main() {
  try {
    const stdin = (0, import_fs4.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const type = p.agent_type ?? "";
    const id = p.agent_id ?? "";
    const transcriptPath = p.transcript_path ?? "";
    const sessionId = p.session_id ?? "";
    log(LOG_FILE, `START ${type}:${id}`);
    logEvent({ event: "start", agent: type, id, session: sessionId });
    if (sessionId) {
      const currentState = getState(sessionId);
      if (currentState?.currentAgent && currentState.currentAgent === type.toLowerCase()) {
        updateState(sessionId, { currentAgent: void 0, chainBlockCount: 0 });
      }
    }
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
    if (state?.activeTeam) {
      const team = state.activeTeam;
      const myTeammate = team.teammates.find((t) => t.agent === type.toLowerCase());
      if (myTeammate) {
        context += `
## Team Context
You are part of the **${team.name}** team.
Your role: **${myTeammate.name}**
Other teammates: ${team.teammates.filter((t) => t.name !== myTeammate.name).map((t) => t.name).join(", ")}

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
      const prevId = prev.id;
      if (prevId) {
        const tmpOutputFile = (0, import_path5.join)(TMP_DIR, "agent-outputs", `${prevId}.md`);
        if ((0, import_fs4.existsSync)(tmpOutputFile)) {
          try {
            const prevOutput = (0, import_fs4.readFileSync)(tmpOutputFile, "utf-8");
            if (prevOutput) {
              context += `
## Previous Agent: ${prev.type}

${prevOutput}
`;
              log(LOG_FILE, `[PREV] Injected ${prev.type} output (${prevOutput.length} chars)`);
            }
          } catch {
          }
        }
      }
    }
    const cwd = p.cwd ?? process.cwd();
    try {
      const chainContent = readActiveChainContent(cwd);
      if (chainContent) {
        const config = parseFlowContext(chainContent);
        const nodeContext = config[type.toLowerCase()];
        if (nodeContext) {
          context += `
## Chain Instructions
${nodeContext}
`;
          log(LOG_FILE, `[CONTEXT] Injected chain context for ${type} (${nodeContext.length} chars)`);
        }
      }
    } catch (e) {
      log(LOG_FILE, `[CONTEXT] Error: ${e.message}`);
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
