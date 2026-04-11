"use strict";

// src/hooks/post-agent.ts
var import_fs5 = require("fs");
var import_path6 = require("path");
var import_os2 = require("os");

// src/ai/haiku.ts
var import_child_process = require("child_process");
var import_fs = require("fs");
var import_path = require("path");
var AI_MODEL = "claude-haiku-4-5";
var AI_TIMEOUT = 3e4;
function callHaiku(prompt, logFn = () => {
}) {
  const tmpDir = (0, import_fs.mkdtempSync)((0, import_path.join)("/tmp", "ai-call-"));
  const tmpFile = (0, import_path.join)(tmpDir, "prompt.txt");
  try {
    (0, import_fs.writeFileSync)(tmpFile, prompt, { mode: 384 });
    const cleanEnv = { ...process.env };
    delete cleanEnv["CLAUDECODE"];
    const aiOutput = (0, import_child_process.execSync)(`cat "${tmpFile}" | claude -p --model ${AI_MODEL}`, {
      timeout: AI_TIMEOUT,
      encoding: "utf8",
      shell: "/bin/bash",
      env: cleanEnv,
      cwd: tmpDir,
      maxBuffer: 5 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    try {
      (0, import_fs.unlinkSync)(tmpFile);
      (0, import_fs.rmdirSync)(tmpDir);
    } catch {
    }
    let jsonStr = aiOutput.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (err) {
    try {
      (0, import_fs.unlinkSync)(tmpFile);
      (0, import_fs.rmdirSync)(tmpDir);
    } catch {
    }
    const error = err;
    logFn(`[AI ERROR] ${error.message}`);
    if (error.killed) {
      return { error: "timeout", message: "AI verification timed out" };
    }
    return { error: "call_failed", message: error.message };
  }
}

// src/utils/state.ts
var import_fs2 = require("fs");
var import_path3 = require("path");

// src/utils/paths.ts
var import_os = require("os");
var import_path2 = require("path");
var HOME = (0, import_os.homedir)();
var CLAUDE_DIR = (0, import_path2.join)(HOME, ".claude");
var CHAINS_DIR = (0, import_path2.join)(CLAUDE_DIR, "chains");
var BACKUP_DIR = (0, import_path2.join)(CHAINS_DIR, ".backup");
var AGENTS_DIR = (0, import_path2.join)(CLAUDE_DIR, "agents");
var SKILLS_DIR = (0, import_path2.join)(CLAUDE_DIR, "skills");
var HOOKS_DIR = (0, import_path2.join)(CLAUDE_DIR, "hooks", "chains");
var CUSTOM_HOOKS_DIR = (0, import_path2.join)(HOOKS_DIR, "custom");
var TMP_DIR = (0, import_path2.join)(CLAUDE_DIR, "tmp");
var PROJECTS_DIR = (0, import_path2.join)(CLAUDE_DIR, "projects");
var SETTINGS_FILE = (0, import_path2.join)(CLAUDE_DIR, "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path2.join)(HOOKS_DIR, "verification-rules.json");
var HOOKS_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "hooks-config.yaml");
var CHAIN_EVENTS_LOG = (0, import_path2.join)(TMP_DIR, "chain-events.jsonl");

// src/utils/state.ts
var STATE_DIR = (0, import_path3.join)(TMP_DIR, "chain-state");
function statePath(sessionId) {
  return (0, import_path3.join)(STATE_DIR, `${sessionId}.json`);
}
function getState(sessionId) {
  if (!sessionId) return null;
  const file = statePath(sessionId);
  if (!(0, import_fs2.existsSync)(file)) return null;
  try {
    return JSON.parse((0, import_fs2.readFileSync)(file, "utf-8"));
  } catch {
    return null;
  }
}
function updateState(sessionId, updates) {
  if (!sessionId) return;
  if (!(0, import_fs2.existsSync)(STATE_DIR)) (0, import_fs2.mkdirSync)(STATE_DIR, { recursive: true });
  const current = getState(sessionId) || { previousAgents: [] };
  const merged = { ...current, ...updates };
  (0, import_fs2.writeFileSync)(statePath(sessionId), JSON.stringify(merged, null, 2));
}

// src/utils/logger.ts
var import_fs3 = require("fs");
var import_path4 = require("path");
function log(file, msg) {
  const dir = (0, import_path4.dirname)(file);
  if (!(0, import_fs3.existsSync)(dir)) (0, import_fs3.mkdirSync)(dir, { recursive: true });
  (0, import_fs3.appendFileSync)(file, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`);
}
function logEvent(data) {
  const dir = (0, import_path4.dirname)(CHAIN_EVENTS_LOG);
  if (!(0, import_fs3.existsSync)(dir)) (0, import_fs3.mkdirSync)(dir, { recursive: true });
  const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), ...data };
  (0, import_fs3.appendFileSync)(CHAIN_EVENTS_LOG, JSON.stringify(entry) + "\n");
}

// src/utils/chain-resolver.ts
var import_fs4 = require("fs");
var import_path5 = require("path");
function resolveActiveChain(cwd) {
  const pointerPath = (0, import_path5.join)(cwd, ".claude", "chain-config.yaml");
  if (!(0, import_fs4.existsSync)(pointerPath)) return null;
  const content = (0, import_fs4.readFileSync)(pointerPath, "utf-8");
  if (/^(flow|hooks):/m.test(content)) {
    return { configPath: pointerPath, chainName: "default", isLegacy: true };
  }
  const activeMatch = content.match(/^active:\s*(.+)/m);
  if (!activeMatch) return null;
  const active = activeMatch[1].trim();
  const dirMatch = content.match(/^chains_dir:\s*(.+)/m);
  const chainsDir = dirMatch ? dirMatch[1].trim() : ".claude/chains/";
  if (active.includes("..") || chainsDir.includes("..")) return null;
  const chainPath = (0, import_path5.join)(cwd, chainsDir, `${active}.yaml`);
  const resolvedPath = (0, import_path5.resolve)(chainPath);
  const expectedBase = (0, import_path5.resolve)((0, import_path5.join)(cwd, ".claude"));
  if (!resolvedPath.startsWith(expectedBase)) return null;
  if (!(0, import_fs4.existsSync)(chainPath)) return null;
  return { configPath: chainPath, chainName: active, isLegacy: false };
}
function readActiveChainContent(cwd) {
  const resolved = resolveActiveChain(cwd);
  if (!resolved) return null;
  return (0, import_fs4.readFileSync)(resolved.configPath, "utf-8");
}

// src/hooks/post-agent.ts
var LOG_FILE = (0, import_path6.join)(TMP_DIR, "agent-output.log");
var PLANS_DIR = (0, import_path6.join)((0, import_os2.homedir)(), ".claude", "plans");
var MAX_AGENT_LOOPS = 0;
var DEFAULT_SAVE_AGENTS = ["explore"];
function loadChainConfig(cwd) {
  try {
    const content = readActiveChainContent(cwd);
    if (!content) return { saveOutput: [...DEFAULT_SAVE_AGENTS] };
    return parseSimpleYaml(content);
  } catch {
    return { saveOutput: [...DEFAULT_SAVE_AGENTS] };
  }
}
function parseSimpleYaml(content) {
  const config = { flow: {}, saveOutput: [...DEFAULT_SAVE_AGENTS] };
  let currentSection = "";
  let currentAgent = "";
  let currentSubSection = "";
  let multilineKey = "";
  let multilineValue = "";
  let multilineIndent = 0;
  let currentTeammate = null;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (multilineKey && currentAgent) {
      const lineIndent = line.search(/\S|$/);
      if (lineIndent > multilineIndent || line.trim() === "") {
        multilineValue += (multilineValue ? "\n" : "") + line.trim();
        continue;
      } else {
        config.flow[currentAgent][multilineKey] = multilineValue;
        multilineKey = "";
        multilineValue = "";
        multilineIndent = 0;
      }
    }
    if (line.trim().startsWith("#") || !line.trim()) continue;
    const sectionMatch = line.match(/^(\w+):$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      currentAgent = "";
      currentSubSection = "";
      currentTeammate = null;
      continue;
    }
    if (currentSection === "saveOutput") {
      const itemMatch = line.match(/^\s+-\s+(.+)/);
      if (itemMatch) {
        if (!config.saveOutput) config.saveOutput = [];
        config.saveOutput.push(itemMatch[1].trim().toLowerCase());
      }
      continue;
    }
    if (currentSection === "flow") {
      const agentMatch = line.match(/^  (\S+):$/);
      if (agentMatch) {
        if (currentTeammate && currentSubSection === "teammates") {
          config.flow[currentAgent].teammates.push(currentTeammate);
        }
        currentAgent = agentMatch[1];
        currentSubSection = "";
        currentTeammate = null;
        config.flow[currentAgent] = {};
        continue;
      }
      const subSectionMatch = line.match(/^    (routes|teammates):$/);
      if (subSectionMatch && currentAgent) {
        if (currentTeammate && currentSubSection === "teammates") {
          config.flow[currentAgent].teammates.push(currentTeammate);
        }
        currentSubSection = subSectionMatch[1];
        currentTeammate = null;
        if (currentSubSection === "routes") {
          config.flow[currentAgent].routes = {};
        } else if (currentSubSection === "teammates") {
          config.flow[currentAgent].teammates = [];
        }
        continue;
      }
      if (currentSubSection === "teammates" && currentAgent) {
        const arrayItemMatch = line.match(/^      - (\w+):\s*"?([^"]*)"?$/);
        if (arrayItemMatch) {
          if (currentTeammate) {
            config.flow[currentAgent].teammates.push(currentTeammate);
          }
          currentTeammate = { name: "", agent: "" };
          const [, key, value] = arrayItemMatch;
          currentTeammate[key] = value.trim();
          continue;
        }
        const teammatePropMatch = line.match(/^        (\w+):\s*"?([^"]*)"?$/);
        if (teammatePropMatch && currentTeammate) {
          const [, key, value] = teammatePropMatch;
          currentTeammate[key] = value.trim();
          continue;
        }
        if (currentTeammate && !line.match(/^      /)) {
          config.flow[currentAgent].teammates.push(currentTeammate);
          currentTeammate = null;
          currentSubSection = "";
        }
      }
      if (currentSubSection === "routes" && currentAgent) {
        const routeMatch = line.match(/^      (\S+):\s*"?([^"]*)"?$/);
        if (routeMatch) {
          const [, routeAgent, description] = routeMatch;
          config.flow[currentAgent].routes[routeAgent] = description.trim();
          continue;
        }
      }
      const multilineMatch = line.match(/^    (\w+):\s*\|$/);
      if (multilineMatch && currentAgent) {
        if (currentSubSection === "teammates" && currentTeammate) {
          config.flow[currentAgent].teammates.push(currentTeammate);
          currentTeammate = null;
        }
        currentSubSection = "";
        multilineKey = multilineMatch[1];
        multilineValue = "";
        multilineIndent = 4;
        continue;
      }
      const propMatch = line.match(/^    (\w+):\s*(.+)/);
      if (propMatch && currentAgent && !currentSubSection) {
        const [, key, value] = propMatch;
        const cleanValue = value.trim() === "null" ? null : value.trim();
        config.flow[currentAgent][key] = cleanValue;
      }
    }
  }
  if (multilineKey && currentAgent && multilineValue) {
    config.flow[currentAgent][multilineKey] = multilineValue;
  }
  if (currentTeammate && currentAgent && currentSubSection === "teammates") {
    config.flow[currentAgent].teammates.push(currentTeammate);
  }
  return config;
}
function getNextAgent(agentType, output, config) {
  const flow = config.flow?.[agentType.toLowerCase()];
  if (!flow) {
    return { next: null, reason: "No flow defined for this agent" };
  }
  const routes = flow.routes ?? {};
  if (!flow.routes) {
    if (flow.next) routes["next"] = flow.next;
    if (flow.on_fail) routes["on_fail"] = flow.on_fail;
    if (flow.on_issues) routes["on_issues"] = flow.on_issues;
  }
  const routeNames = Object.keys(routes);
  const defaultNext = flow.next ?? routeNames[0] ?? null;
  if (flow.decide && output.length > 50 && routeNames.length > 0) {
    const routesList = routeNames.map((name) => {
      const desc = routes[name];
      return `- "${name}" \u2192 ${desc || name}`;
    }).join("\n");
    const prompt = `You are a chain router. Analyze the agent output and decide which agent to route to next.

ROUTING RULES:
${flow.decide}

AVAILABLE ROUTES:
${routesList}
- "END" \u2192 Stop the chain (no next agent)

AGENT OUTPUT:
${output.substring(0, 2e3)}

Based on the routing rules and output, which route should be taken?
Respond ONLY with JSON: {"route": "<agent-name or END>", "reason": "brief explanation"}`;
    try {
      const result = callHaiku(prompt);
      if (result && !result["error"]) {
        const route = result["route"] || "";
        const reason = result["reason"] || "AI decision";
        if (route === "END" || route === "end" || route === "null") {
          return { next: null, reason: `[AI] ${reason}` };
        }
        if (routes[route]) {
          return { next: route, reason: `[AI] ${reason}` };
        }
        const matchedKey = routeNames.find((r) => routes[r] === route);
        if (matchedKey) {
          return { next: matchedKey, reason: `[AI] ${reason}` };
        }
      }
    } catch {
    }
  }
  const outputLower = output.toLowerCase();
  const hasIssues = outputLower.includes("issues") || outputLower.includes("fail") || outputLower.includes("error") || outputLower.includes("bug");
  const hasPassed = outputLower.includes("pass") || outputLower.includes("approved") || outputLower.includes("success");
  if (hasIssues && !hasPassed) {
    if (flow.on_fail) {
      return { next: flow.on_fail, reason: "Output indicates failure" };
    }
    if (flow.on_issues) {
      return { next: flow.on_issues, reason: "Output indicates issues" };
    }
  }
  return { next: defaultNext, reason: "Default next in flow" };
}
function extractPhases(planContent) {
  const phases = [];
  const lines = planContent.split("\n");
  const phaseRegex = /^##\s*(?:Phase|Step|Stage)\s*(\d+)[:\s-]*(.*)/i;
  const numberedRegex = /^##\s*(\d+)\.\s*(.*)/;
  const implPhaseRegex = /^###?\s*(?:Implementation\s+)?(?:Phase|Step)\s*(\d+)/i;
  for (const line of lines) {
    const match = line.match(phaseRegex) ?? line.match(numberedRegex) ?? line.match(implPhaseRegex);
    if (match) {
      phases.push({
        number: parseInt(match[1], 10),
        title: (match[2] ?? "").trim(),
        line,
        completed: false
      });
    }
  }
  return phases;
}
function findRecentPlan(sessionId) {
  const state = getState(sessionId);
  if (state?.phaseTracking) {
    const pt = state.phaseTracking;
    if (pt.planFile && (0, import_fs5.existsSync)(pt.planFile)) return pt.planFile;
  }
  if (!(0, import_fs5.existsSync)(PLANS_DIR)) return null;
  const files = (0, import_fs5.readdirSync)(PLANS_DIR).filter((f) => f.endsWith(".md")).map((f) => ({
    path: (0, import_path6.join)(PLANS_DIR, f),
    mtime: (0, import_fs5.statSync)((0, import_path6.join)(PLANS_DIR, f)).mtime
  })).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return files[0]?.path ?? null;
}
function checkPhaseProgress(sessionId) {
  const rawState = getState(sessionId);
  const state = rawState ?? {};
  let tracking = state.phaseTracking;
  if (!tracking) {
    const planFile = findRecentPlan(sessionId);
    if (!planFile) return { hasMore: false };
    try {
      const planContent = (0, import_fs5.readFileSync)(planFile, "utf-8");
      const phases = extractPhases(planContent);
      if (phases.length <= 1) return { hasMore: false };
      tracking = {
        planFile,
        totalPhases: phases.length,
        completedPhases: 0,
        phases: phases.map((p) => ({ ...p, completed: false }))
      };
      updateState(sessionId, { phaseTracking: tracking });
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
    updateState(sessionId, { phaseTracking: tracking });
    const nextPhase = tracking.phases[current];
    return {
      hasMore: true,
      currentPhase: current,
      totalPhases: total,
      nextPhase: nextPhase?.title || `Phase ${current + 1}`,
      planFile: tracking.planFile
    };
  }
  updateState(sessionId, { phaseTracking: void 0 });
  return { hasMore: false, allComplete: true };
}
var STATS_DIR = (0, import_path6.join)(TMP_DIR, "agent-stats");
function loadAgentStats(agentId) {
  const statsFile = (0, import_path6.join)(STATS_DIR, `${agentId}.json`);
  if (!(0, import_fs5.existsSync)(statsFile)) return null;
  try {
    const stats = JSON.parse((0, import_fs5.readFileSync)(statsFile, "utf-8"));
    (0, import_fs5.unlinkSync)(statsFile);
    return stats;
  } catch {
    return null;
  }
}
function formatStatsYaml(stats) {
  let yaml = "";
  if (Object.keys(stats.toolBreakdown).length > 0) {
    yaml += "tool_breakdown:\n";
    for (const [tool, count] of Object.entries(stats.toolBreakdown)) {
      yaml += `  ${tool}: ${count}
`;
    }
  }
  if (stats.filesRead.length > 0) {
    yaml += "files_read:\n";
    for (const f of stats.filesRead.slice(0, 30)) yaml += `  - "${f}"
`;
  }
  if (stats.filesEdited.length > 0) {
    yaml += "files_modified:\n";
    for (const f of stats.filesEdited.slice(0, 30)) yaml += `  - "${f}"
`;
  }
  if (stats.filesCreated.length > 0) {
    yaml += "files_created:\n";
    for (const f of stats.filesCreated.slice(0, 30)) yaml += `  - "${f}"
`;
  }
  if (stats.bashCommands.length > 0) {
    yaml += "bash_commands:\n";
    for (const c of stats.bashCommands.slice(0, 20)) yaml += `  - "${c.replace(/"/g, '\\"')}"
`;
  }
  if (stats.grepPatterns.length > 0) {
    yaml += "grep_searches:\n";
    for (const p of stats.grepPatterns.slice(0, 20)) yaml += `  - "${p.replace(/"/g, '\\"')}"
`;
  }
  return yaml;
}
function main() {
  try {
    const stdin = (0, import_fs5.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const type = p.tool_input?.subagent_type ?? "agent";
    const id = p.tool_response?.agentId ?? "?";
    const tokens = p.tool_response?.totalTokens ?? 0;
    const ms = p.tool_response?.totalDurationMs ?? 0;
    const tools = p.tool_response?.totalToolUseCount ?? 0;
    const prompt = p.tool_input?.prompt ?? "";
    const description = p.tool_input?.description ?? "";
    const _transcriptPath = p.transcript_path ?? "";
    const sessionId = p.session_id ?? "";
    const cwd = p.cwd ?? process.cwd();
    void _transcriptPath;
    const config = loadChainConfig(cwd);
    let text = "";
    if (p.tool_response?.content) {
      for (const c of p.tool_response.content) {
        if (c.type === "text") {
          text = c.text;
          break;
        }
      }
    }
    const hasActiveChain = config.flow && Object.keys(config.flow).length > 0;
    const agentInFlow = hasActiveChain && config.flow[type.toLowerCase()];
    if (!agentInFlow) {
      const secs2 = (ms / 1e3).toFixed(1);
      const kTok2 = (tokens / 1e3).toFixed(1);
      const preview2 = text.length > 200 ? text.substring(0, 200) + "..." : text;
      const noti2 = `Agent ${type} completed | ${secs2}s | ${kTok2}k tokens | ${tools} tools

${preview2}`;
      log(LOG_FILE, `
[${(/* @__PURE__ */ new Date()).toISOString()}] ${type}:${id} ${secs2}s ${kTok2}k \u2192 NO CHAIN
`);
      if (text && cwd && config.saveOutput?.includes(type.toLowerCase())) {
        try {
          const outputDir = (0, import_path6.join)(cwd, ".claude", "outputs", type.toLowerCase());
          if (!(0, import_fs5.existsSync)(outputDir)) (0, import_fs5.mkdirSync)(outputDir, { recursive: true });
          const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").substring(0, 19);
          const filename = `${ts}.md`;
          const stats = loadAgentStats(id);
          const statsYaml = stats ? formatStatsYaml(stats) : "";
          const header = `---
agent: ${type}
id: ${id}
tokens: ${tokens}
duration_ms: ${ms}
tools_used: ${tools}
timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
session: ${sessionId}
description: "${description.replace(/"/g, '\\"')}"
${statsYaml}---

`;
          const promptSection = prompt ? `## Prompt

${prompt}

## Output

` : "";
          (0, import_fs5.writeFileSync)((0, import_path6.join)(outputDir, filename), header + promptSection + text);
          log(LOG_FILE, `[SAVE] ${type} \u2192 ${type.toLowerCase()}/${filename} (${text.length} chars)`);
        } catch {
        }
      }
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: noti2
        }
      }));
      process.exit(0);
    }
    const isBackgrounded = tokens === 0 && ms === 0 && text.length === 0;
    if (isBackgrounded) {
      const dir = (0, import_path6.dirname)(LOG_FILE);
      if (!(0, import_fs5.existsSync)(dir)) (0, import_fs5.mkdirSync)(dir, { recursive: true });
      log(LOG_FILE, `
[${(/* @__PURE__ */ new Date()).toISOString()}] ${type}:${id} BACKGROUNDED (waiting)
`);
      logEvent({ event: "backgrounded", agent: type, id });
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `<system-reminder>
## BACKGROUND AGENT DETECTED
Agent **${type}** was launched in background and returned empty.

**You MUST wait for this agent to complete before proceeding.**
Do NOT spawn new agents. Do NOT run commands. Do NOT skip ahead.
The chain will continue automatically when the agent finishes.
</system-reminder>`
        }
      }));
      process.exit(2);
    }
    const chainDecision = getNextAgent(type, text, config);
    let next = chainDecision.next;
    if (type.toLowerCase() === "git-manager" && sessionId) {
      const progress = checkPhaseProgress(sessionId);
      if (progress.hasMore) {
        next = "implementer";
        log(LOG_FILE, `[PHASE] ${progress.currentPhase}/${progress.totalPhases} \u2192 implementer: ${progress.nextPhase}
`);
      } else if (progress.allComplete) {
        next = null;
        log(LOG_FILE, `[PHASE] All phases complete
`);
      }
    }
    const currentFlow = config.flow?.[type.toLowerCase()];
    if (next && sessionId && currentFlow?.reset_counters === "true") {
      const state = getState(sessionId) ?? { previousAgents: [] };
      state.previousAgents = (state.previousAgents ?? []).filter((a) => a.type !== next);
      updateState(sessionId, state);
    }
    if (next && sessionId) {
      const state = getState(sessionId) ?? { previousAgents: [] };
      const nextAgentCount = (state.previousAgents ?? []).filter((a) => a.type === next).length;
      if (MAX_AGENT_LOOPS > 0 && nextAgentCount >= MAX_AGENT_LOOPS) {
        log(LOG_FILE, `[LOOP BREAK] ${next} already ran ${nextAgentCount} times
`);
        logEvent({ event: "loop-break", agent: type, next, count: nextAgentCount, session: sessionId });
        console.log(JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: `**Chain stopped** \u2014 **${next}** already ran ${nextAgentCount} times (max ${MAX_AGENT_LOOPS}). Review the output above and decide how to proceed.

<system-reminder>
## CHAIN LOOP DETECTED
The agent **${next}** has hit the maximum revision limit (${nextAgentCount}/${MAX_AGENT_LOOPS}).
Do NOT spawn another agent. Report this to the user with a clear summary of what was accomplished and what still needs attention.
</system-reminder>`
          }
        }));
        process.exit(2);
      }
    }
    const preview = text.length > 200 ? text.substring(0, 200) + "..." : text;
    const secs = (ms / 1e3).toFixed(1);
    const kTok = (tokens / 1e3).toFixed(1);
    let noti = `Agent ${type} completed | ${secs}s | ${kTok}k tokens | ${tools} tools`;
    if (next) {
      const nextFlow = config.flow?.[next];
      if (nextFlow?.type === "team" && nextFlow.teammates) {
        const teammates = nextFlow.teammates;
        const teamInstruction = teammates.map(
          (t) => `- Teammate "${t.name}" using agent type "${t.agent}"${t.prompt ? `: ${t.prompt}` : ""}${t.model ? ` (model: ${t.model})` : ""}`
        ).join("\n");
        const routesList = nextFlow.routes ? Object.entries(nextFlow.routes).map(([agent, desc]) => `- "${agent}" \u2192 ${desc}`).join("\n") : "";
        noti += `

<system-reminder>
## MANDATORY NEXT STEP \u2014 AGENT TEAM
You MUST now create an agent team for the **${next}** step.

Create a team with these teammates:
${teamInstruction}

Each teammate should work in parallel. After all teammates complete, synthesize their results and continue the chain.

Use the TeamCreate tool to create the team with the above configuration.
${routesList ? `
After the team completes, route based on:
${routesList}` : ""}
${nextFlow.decide ? `
Routing rules:
${nextFlow.decide}` : ""}
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
      noti += `

Chain complete. No next agent.`;
    }
    noti += `

${preview}`;
    log(LOG_FILE, `
[${(/* @__PURE__ */ new Date()).toISOString()}] ${type}:${id} ${secs}s ${kTok}k \u2192 ${next ?? "END"}
`);
    logEvent({
      event: "complete",
      agent: type,
      id,
      tokens,
      duration: ms,
      tools,
      next: next ?? null,
      reason: chainDecision.reason
    });
    if (sessionId) {
      const state = getState(sessionId) ?? { previousAgents: [] };
      state.previousAgents = state.previousAgents ?? [];
      state.previousAgents.push({
        type,
        id,
        completedAt: (/* @__PURE__ */ new Date()).toISOString(),
        outputSummary: preview.substring(0, 100)
      });
      state.currentAgent = next ?? null;
      updateState(sessionId, state);
      try {
        const tmpOutputDir = (0, import_path6.join)(TMP_DIR, "agent-outputs");
        if (!(0, import_fs5.existsSync)(tmpOutputDir)) (0, import_fs5.mkdirSync)(tmpOutputDir, { recursive: true });
        (0, import_fs5.writeFileSync)((0, import_path6.join)(tmpOutputDir, `${id}.md`), text);
      } catch {
      }
    }
    const flowNode = config.flow[type.toLowerCase()];
    if (flowNode?.saveOutput === "true" && text && cwd) {
      try {
        const outputDir = (0, import_path6.join)(cwd, ".claude", "outputs", type.toLowerCase());
        if (!(0, import_fs5.existsSync)(outputDir)) (0, import_fs5.mkdirSync)(outputDir, { recursive: true });
        const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").substring(0, 19);
        const filename = `${ts}.md`;
        const stats = loadAgentStats(id);
        const statsYaml = stats ? formatStatsYaml(stats) : "";
        const header = `---
agent: ${type}
id: ${id}
tokens: ${tokens}
duration_ms: ${ms}
tools_used: ${tools}
timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}
session: ${sessionId}
next: ${next ?? "END"}
description: "${description.replace(/"/g, '\\"')}"
${statsYaml}---

`;
        const promptSection = prompt ? `## Prompt

${prompt}

## Output

` : "";
        (0, import_fs5.writeFileSync)((0, import_path6.join)(outputDir, filename), header + promptSection + text);
        log(LOG_FILE, `[SAVE] ${type} \u2192 ${type.toLowerCase()}/${filename} (${text.length} chars)`);
      } catch {
      }
    }
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
