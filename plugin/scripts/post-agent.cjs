"use strict";

// src/hooks/post-agent.ts
var import_fs4 = require("fs");
var import_path5 = require("path");
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
var TMP_DIR = (0, import_path2.join)(CLAUDE_DIR, "tmp");
var SETTINGS_FILE = (0, import_path2.join)(CLAUDE_DIR, "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path2.join)(HOOKS_DIR, "verification-rules.json");
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

// src/hooks/post-agent.ts
var LOG_FILE = (0, import_path5.join)(TMP_DIR, "agent-output.log");
var PLANS_DIR = (0, import_path5.join)((0, import_os2.homedir)(), ".claude", "plans");
var MAX_AGENT_LOOPS = 3;
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
    if (pt.planFile && (0, import_fs4.existsSync)(pt.planFile)) return pt.planFile;
  }
  if (!(0, import_fs4.existsSync)(PLANS_DIR)) return null;
  const files = (0, import_fs4.readdirSync)(PLANS_DIR).filter((f) => f.endsWith(".md")).map((f) => ({
    path: (0, import_path5.join)(PLANS_DIR, f),
    mtime: (0, import_fs4.statSync)((0, import_path5.join)(PLANS_DIR, f)).mtime
  })).sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return files[0]?.path ?? null;
}
function initPhaseTracking(sessionId) {
  const planFile = findRecentPlan(sessionId);
  if (!planFile) return null;
  try {
    const planContent = (0, import_fs4.readFileSync)(planFile, "utf-8");
    const phases = extractPhases(planContent);
    if (phases.length <= 1) return null;
    return {
      planFile,
      totalPhases: phases.length,
      completedPhases: 0,
      phases: phases.map((p) => ({ ...p, completed: false }))
    };
  } catch {
    return null;
  }
}
function checkPhaseProgress(sessionId) {
  const rawState = getState(sessionId);
  const state = rawState ?? {};
  let tracking = state.phaseTracking;
  if (!tracking) {
    const init = initPhaseTracking(sessionId);
    if (!init) return { hasMore: false };
    tracking = init;
    updateState(sessionId, { phaseTracking: tracking });
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
function getPhaseInfo(sessionId) {
  const state = getState(sessionId);
  const tracking = state?.phaseTracking;
  if (!tracking) return null;
  return {
    completedPhases: tracking.completedPhases,
    totalPhases: tracking.totalPhases,
    remainingPhases: tracking.totalPhases - tracking.completedPhases,
    phases: tracking.phases,
    planFile: tracking.planFile
  };
}
function decideNextAgent(agentType, output, defaultNext) {
  if (!output || output.length < 50) {
    return { next: defaultNext ?? null, reason: "Output too short, using default" };
  }
  const prompt = `Analyze this ${agentType} agent output and decide the next agent in the workflow.

CURRENT AGENT: ${agentType}
DEFAULT NEXT: ${defaultNext ?? "none"}

CHAIN RULES:
- tester: if tests PASS \u2192 git-manager (commit), if FAIL/BUGS \u2192 debugger (fix)
- code-reviewer: if APPROVED (no HIGH/MEDIUM issues) \u2192 tester, if ANY issues (HIGH/MEDIUM/mismatch/bug/fix needed) \u2192 implementer (fix)
- plan-reviewer: if APPROVED \u2192 implementer, if ISSUES \u2192 planner (revise)
- debugger: after fix \u2192 implementer (apply fix)
- implementer: \u2192 code-reviewer
- git-manager: if "Remaining" phases listed \u2192 implementer (next phase), if "None" or no phases \u2192 null (end)

IMPORTANT: For code-reviewer, if the output mentions ANY bug, mismatch, missing field, wrong name, or needed fix \u2014 even if some checks pass \u2014 the verdict is ISSUES \u2192 implementer. Only route to tester if EVERYTHING is clean with zero issues found.

AGENT OUTPUT:
${output}

Based on the output, what should be the next agent?
Respond ONLY with JSON:
{"next": "agent-name or null", "reason": "brief explanation"}`;
  try {
    const result = callHaiku(prompt);
    if (result["error"]) {
      return { next: defaultNext ?? null, reason: "AI error, using default" };
    }
    return {
      next: result["next"] ?? null,
      reason: result["reason"] || "AI decision"
    };
  } catch {
    return { next: defaultNext ?? null, reason: "Error, using default" };
  }
}
function main() {
  try {
    const stdin = (0, import_fs4.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const type = p.tool_input?.subagent_type ?? "agent";
    const id = p.tool_response?.agentId ?? "?";
    const tokens = p.tool_response?.totalTokens ?? 0;
    const ms = p.tool_response?.totalDurationMs ?? 0;
    const tools = p.tool_response?.totalToolUseCount ?? 0;
    const transcriptPath = p.transcript_path ?? "";
    const sessionId = p.session_id ?? "";
    let text = "";
    if (p.tool_response?.content) {
      for (const c of p.tool_response.content) {
        if (c.type === "text") {
          text = c.text;
          break;
        }
      }
    }
    const isBackgrounded = tokens === 0 && ms === 0 && text.length === 0;
    if (isBackgrounded) {
      const dir = (0, import_path5.dirname)(LOG_FILE);
      if (!(0, import_fs4.existsSync)(dir)) (0, import_fs4.mkdirSync)(dir, { recursive: true });
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
    const agentConfig = CONFIG.agents[type.toLowerCase()];
    let next = agentConfig?.chainNext;
    let chainDecision = null;
    if (type.toLowerCase() === "git-manager" && sessionId) {
      const progress = checkPhaseProgress(sessionId);
      if (progress.hasMore) {
        next = "implementer";
        chainDecision = {
          next: "implementer",
          reason: `Phase ${progress.currentPhase}/${progress.totalPhases} committed. Next: "${progress.nextPhase}" (from ${progress.planFile})`
        };
        log(LOG_FILE, `[PHASE] ${progress.currentPhase}/${progress.totalPhases} \u2192 implementer: ${progress.nextPhase}
`);
      } else if (progress.allComplete) {
        next = null;
        chainDecision = { next: null, reason: `All ${progress.totalPhases ?? ""} phases complete` };
        log(LOG_FILE, `[PHASE] All phases complete
`);
      } else {
        chainDecision = decideNextAgent(type, text, next);
        if (chainDecision.next !== next) {
          next = chainDecision.next;
          log(LOG_FILE, `[CHAIN] ${type} \u2192 ${next} (${chainDecision.reason})
`);
        }
      }
    }
    const conditionalAgents = ["tester", "code-reviewer", "plan-reviewer"];
    if (!chainDecision && conditionalAgents.includes(type.toLowerCase())) {
      chainDecision = decideNextAgent(type, text, next);
      if (chainDecision.next !== next) {
        next = chainDecision.next;
        log(LOG_FILE, `[CHAIN] ${type} \u2192 ${next} (${chainDecision.reason})
`);
      }
    }
    if (next && sessionId) {
      const state = getState(sessionId) ?? { previousAgents: [] };
      const nextAgentCount = (state.previousAgents ?? []).filter(
        (a) => a.type === next
      ).length;
      if (nextAgentCount >= MAX_AGENT_LOOPS) {
        log(LOG_FILE, `[LOOP BREAK] ${next} already ran ${nextAgentCount} times \u2014 stopping chain
`);
        logEvent({ event: "loop-break", agent: type, next, count: nextAgentCount, session: sessionId });
        const loopNoti = `Agent ${type} completed | Chain stopped \u2014 **${next}** already ran ${nextAgentCount} times this session (max ${MAX_AGENT_LOOPS}).

<system-reminder>
## CHAIN LOOP DETECTED \u2014 STOPPED
Agent **${next}** has been called ${nextAgentCount} times. This likely means there's a recurring issue that agents cannot resolve automatically.

**Do NOT spawn another agent.** Report the situation to the user and ask for guidance.

Summary of loop: ${(state.previousAgents ?? []).filter((a) => a.type === next).map((a) => a.outputSummary).join(" \u2192 ")}
</system-reminder>`;
        console.log(JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: loopNoti
          }
        }));
        process.exit(2);
      }
    }
    const preview = text.length > 200 ? text.substring(0, 200) + "..." : text;
    const secs = (ms / 1e3).toFixed(1);
    const kTok = (tokens / 1e3).toFixed(1);
    let noti = `Agent ${type} completed | ${secs}s | ${kTok}k tokens | ${tools} tools`;
    if (chainDecision && chainDecision.next !== agentConfig?.chainNext) {
      noti += `

## CHAIN REDIRECTED: ${chainDecision.reason}`;
    }
    if (next) {
      let phaseContext = "";
      if (type.toLowerCase() === "git-manager" && next === "implementer" && sessionId) {
        const info = getPhaseInfo(sessionId);
        if (info) {
          phaseContext = `
Phase Progress: ${info.completedPhases}/${info.totalPhases} done, ${info.remainingPhases} remaining.
Plan file: ${info.planFile}
Implement the NEXT phase only.`;
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
    noti += `

Context: ${transcriptPath}`;
    noti += `
${preview}`;
    log(LOG_FILE, `
[${(/* @__PURE__ */ new Date()).toISOString()}] ${type}:${id} ${secs}s ${kTok}k
`);
    logEvent({
      event: "complete",
      agent: type,
      id,
      tokens,
      duration: ms,
      tools,
      next: next ?? null,
      chainDecision: chainDecision?.reason ?? null
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
