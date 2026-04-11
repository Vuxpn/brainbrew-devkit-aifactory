"use strict";

// src/hooks/subagent-stop.ts
var import_fs4 = require("fs");
var import_path5 = require("path");

// src/ai/verifier.ts
var import_fs3 = require("fs");
var import_path4 = require("path");

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

// src/ai/criteria.ts
var AGENT_CRITERIA = {
  planner: {
    role: "Creates actionable plans (code, research, tasks, anything)",
    mustHave: [
      "Clear structure (headers, lists, or logical flow)",
      "Specific actionable steps (not vague)",
      "Enough detail to execute without asking questions",
      "Addresses the actual request"
    ],
    mustNot: [
      "Vague statements without specifics",
      "Just a summary without action items",
      "Incomplete or cut-off output"
    ],
    minLength: 100
  },
  plan: {
    role: "Creates actionable plans (code, research, tasks, anything)",
    mustHave: [
      "Clear structure (headers, lists, or logical flow)",
      "Specific actionable steps",
      "Addresses the actual request",
      "Complete output (not cut off)"
    ],
    mustNot: [
      "Vague or too high-level",
      "Missing concrete next steps",
      "Incomplete output"
    ],
    minLength: 100
  },
  "plan-reviewer": {
    role: "Reviews plans and approves or requests changes",
    mustHave: [
      "Clear verdict: APPROVED or specific issues listed",
      "If approved: explanation of what was verified",
      "If issues: specific problems with suggestions to fix"
    ],
    mustNot: [
      "Lazy approval without explanation",
      "Vague criticism without specific issues",
      "Missing actionable feedback"
    ],
    minLength: 80
  },
  implementer: {
    role: "Writes actual code based on plans",
    mustHave: [
      "Actual code blocks with real implementation (not pseudocode)",
      "Evidence of file operations (created/modified files)",
      "Code follows existing patterns in codebase"
    ],
    mustNot: [
      "Just descriptions without actual code",
      "Empty or placeholder code blocks",
      "TODO comments instead of implementation"
    ],
    minLength: 100
  },
  "code-reviewer": {
    role: "Reviews code for quality and correctness",
    mustHave: [
      "Clear verdict: approved or issues found",
      "If approved: what aspects were reviewed (security, performance, logic)",
      "If issues: specific locations (file:line) and how to fix"
    ],
    mustNot: [
      "Just 'looks good' without substance",
      "Vague issues without locations",
      "Missing actionable feedback"
    ],
    minLength: 80
  },
  tester: {
    role: "Runs tests and reports results",
    mustHave: [
      "Actual test execution output (PASS/FAIL counts)",
      "Specific test results, not just claims",
      "Evidence tests were actually run"
    ],
    mustNot: [
      "Claims like 'tests passed' without output",
      "Fake or made-up test results",
      "Missing actual terminal output"
    ],
    minLength: 50
  },
  debugger: {
    role: "Investigates and fixes bugs",
    mustHave: [
      "Root cause identified (WHY it failed)",
      "Specific location (file, line, function)",
      "Solution or fix provided"
    ],
    mustNot: [
      "Just symptoms without root cause",
      "Vague 'something is wrong'",
      "Missing fix or next steps"
    ],
    minLength: 100
  },
  researcher: {
    role: "Researches topics and provides findings",
    mustHave: [
      "Structured findings with headers or lists",
      "Sources or evidence cited",
      "Clear conclusions or recommendations"
    ],
    mustNot: [
      "Unstructured wall of text",
      "Claims without sources",
      "Missing actionable insights"
    ],
    minLength: 200
  },
  explorer: {
    role: "Explores codebase and finds files",
    mustHave: [
      "List of files/directories found",
      "Actual paths (not hypothetical)",
      "Structured output (tree or list)"
    ],
    mustNot: [
      "No files listed",
      "Hypothetical paths that don't exist",
      "Unstructured output"
    ],
    minLength: 100
  },
  "docs-manager": {
    role: "Updates documentation",
    mustHave: [
      "Specific documentation files updated",
      "Summary of changes made"
    ],
    mustNot: [
      "No files mentioned",
      "Vague 'updated docs'"
    ],
    minLength: 50
  },
  "git-manager": {
    role: "Performs git operations",
    mustHave: [
      "Git commands executed",
      "Confirmation of actions (commit hash, branch name)"
    ],
    mustNot: [
      "No git operations shown",
      "Unclear what was done"
    ],
    minLength: 30
  }
};

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
var TMP_DIR = (0, import_path2.join)("/tmp", "claude-chain");
var PROJECTS_DIR = (0, import_path2.join)(CLAUDE_DIR, "projects");
var SETTINGS_FILE = (0, import_path2.join)(CLAUDE_DIR, "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path2.join)(HOOKS_DIR, "verification-rules.json");
var HOOKS_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "hooks-config.yaml");
var CHAIN_EVENTS_LOG = (0, import_path2.join)(TMP_DIR, "chain-events.jsonl");

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

// src/ai/verifier.ts
var MAX_OUTPUT_LENGTH = 8e3;
var LOG_FILE = (0, import_path4.join)(TMP_DIR, "ai-verifier.log");
var STATE_DIR = (0, import_path4.join)(TMP_DIR, "verifier-state");
var MAX_RETRIES = 2;
try {
  const cfg = JSON.parse((0, import_fs3.readFileSync)(CHAIN_CONFIG_FILE, "utf-8"));
  MAX_RETRIES = cfg.maxRetries ?? 2;
} catch {
}
function buildPrompt(agentType, output) {
  const criteria = AGENT_CRITERIA[agentType.toLowerCase()];
  if (!criteria) return null;
  const truncated = output.length > MAX_OUTPUT_LENGTH ? output.substring(0, MAX_OUTPUT_LENGTH) + "\n...[truncated]" : output;
  return `You are a QA reviewer for AI agent outputs. Be practical, not pedantic.

AGENT: ${agentType}
ROLE: ${criteria.role}

GOOD OUTPUT SHOULD:
${criteria.mustHave.map((c) => `\u2022 ${c}`).join("\n")}

BAD OUTPUT HAS:
${criteria.mustNot.map((c) => `\u2022 ${c}`).join("\n")}

---
OUTPUT TO REVIEW:
---
${truncated}
---

Evaluate this output:
1. Is it actionable and useful?
2. Does it fulfill the agent's role?
3. Any critical issues that need fixing?

Be lenient on format, strict on substance. Pass if output is genuinely useful.

Respond ONLY with JSON:
{"pass":true/false,"issues":["critical issue only"],"suggestion":"how to fix"}`;
}
function verifyWithAI(agentType, output) {
  const prompt = buildPrompt(agentType, output);
  if (!prompt) {
    return { pass: true, method: "no-criteria" };
  }
  try {
    const parsed = callHaiku(prompt, (msg) => log(LOG_FILE, msg));
    if (parsed["error"]) {
      const errMsg = parsed["error"];
      if (errMsg === "timeout") {
        log(LOG_FILE, `[AI TIMEOUT] ${agentType} - fallback to pass`);
        return { pass: true, method: "timeout-fallback", warning: "AI verification timed out" };
      }
      log(LOG_FILE, `[AI ERROR] ${agentType}: ${parsed["message"]}`);
      return { pass: true, method: "error-fallback", warning: parsed["message"] };
    }
    const result = {
      pass: parsed["pass"] === true,
      issues: parsed["issues"] || [],
      suggestion: parsed["suggestion"] || "",
      method: "ai"
    };
    log(LOG_FILE, `[AI] ${agentType}: ${result.pass ? "PASS" : "FAIL"} | issues: ${result.issues?.length ?? 0} | ${(result.issues ?? []).slice(0, 2).join("; ").substring(0, 100)}`);
    return result;
  } catch (err) {
    const error = err;
    log(LOG_FILE, `[AI ERROR] ${agentType}: ${error.message}`);
    return { pass: true, method: "error-fallback", warning: error.message };
  }
}
function verify(agentType, output) {
  return verifyWithAI(agentType, output);
}
function getRetries(agentId) {
  if (!(0, import_fs3.existsSync)(STATE_DIR)) (0, import_fs3.mkdirSync)(STATE_DIR, { recursive: true });
  try {
    const f = (0, import_path4.join)(STATE_DIR, `${agentId}.json`);
    if ((0, import_fs3.existsSync)(f)) {
      const data = JSON.parse((0, import_fs3.readFileSync)(f, "utf-8"));
      return data.r ?? 0;
    }
  } catch {
  }
  return 0;
}
function setRetries(agentId, n) {
  if (!(0, import_fs3.existsSync)(STATE_DIR)) (0, import_fs3.mkdirSync)(STATE_DIR, { recursive: true });
  (0, import_fs3.writeFileSync)((0, import_path4.join)(STATE_DIR, `${agentId}.json`), JSON.stringify({ r: n, t: Date.now() }));
}
function clearRetries(agentId) {
  const f = (0, import_path4.join)(STATE_DIR, `${agentId}.json`);
  if ((0, import_fs3.existsSync)(f)) (0, import_fs3.unlinkSync)(f);
}

// src/hooks/subagent-stop.ts
var LOG_FILE2 = (0, import_path5.join)(TMP_DIR, "subagent-stop.log");
var STATS_DIR = (0, import_path5.join)(TMP_DIR, "agent-stats");
function parseTranscript(transcriptPath) {
  if (!(0, import_fs4.existsSync)(transcriptPath)) return null;
  try {
    const content = (0, import_fs4.readFileSync)(transcriptPath, "utf-8");
    const stats = {
      toolCalls: [],
      toolBreakdown: {},
      filesRead: [],
      filesEdited: [],
      filesCreated: [],
      bashCommands: [],
      grepPatterns: [],
      globPatterns: []
    };
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry.type !== "assistant") continue;
      const msg = entry.message;
      if (!msg?.content) continue;
      for (const block of msg.content) {
        if (block.type !== "tool_use" || !block.name) continue;
        const tool = block.name;
        const input = block.input ?? {};
        stats.toolBreakdown[tool] = (stats.toolBreakdown[tool] ?? 0) + 1;
        const call = { tool };
        switch (tool) {
          case "Read":
            if (input.file_path) {
              call.file = input.file_path;
              stats.filesRead.push(input.file_path);
            }
            break;
          case "Edit":
          case "MultiEdit":
            if (input.file_path) {
              call.file = input.file_path;
              stats.filesEdited.push(input.file_path);
            }
            break;
          case "Write":
            if (input.file_path) {
              call.file = input.file_path;
              stats.filesCreated.push(input.file_path);
            }
            break;
          case "Bash":
            if (input.command) {
              call.command = input.command.substring(0, 200);
              stats.bashCommands.push(input.command.substring(0, 200));
            }
            break;
          case "Grep":
            if (input.pattern) {
              call.pattern = input.pattern;
              stats.grepPatterns.push(`${input.pattern} in ${input.path ?? "."}`);
            }
            break;
          case "Glob":
            if (input.pattern) {
              call.pattern = input.pattern;
              stats.globPatterns.push(input.pattern);
            }
            break;
        }
        stats.toolCalls.push(call);
      }
    }
    stats.filesRead = [...new Set(stats.filesRead)];
    stats.filesEdited = [...new Set(stats.filesEdited)];
    stats.filesCreated = [...new Set(stats.filesCreated)];
    return stats;
  } catch {
    return null;
  }
}
function main() {
  try {
    const stdin = (0, import_fs4.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const payload = JSON.parse(stdin);
    if (payload.stop_hook_active) {
      log(LOG_FILE2, `[SKIP] stop_hook_active`);
      process.exit(0);
    }
    const agentType = payload.agent_type ?? payload.subagent_type ?? "";
    const agentId = payload.agent_id ?? "x";
    const output = payload.last_assistant_message ?? "";
    const retries = getRetries(agentId);
    if (retries >= MAX_RETRIES) {
      log(LOG_FILE2, `${agentType}:${agentId} max retries (${MAX_RETRIES}), allow`);
      clearRetries(agentId);
      process.exit(0);
    }
    if (payload.agent_transcript_path) {
      const transcriptStats = parseTranscript(payload.agent_transcript_path);
      if (transcriptStats) {
        if (!(0, import_fs4.existsSync)(STATS_DIR)) (0, import_fs4.mkdirSync)(STATS_DIR, { recursive: true });
        (0, import_fs4.writeFileSync)((0, import_path5.join)(STATS_DIR, `${agentId}.json`), JSON.stringify(transcriptStats));
        log(LOG_FILE2, `[STATS] ${agentType}:${agentId} | tools=${transcriptStats.toolCalls.length} | read=${transcriptStats.filesRead.length} | edit=${transcriptStats.filesEdited.length} | bash=${transcriptStats.bashCommands.length}`);
      }
    }
    const result = verify(agentType, output);
    const outputPreview = output.substring(0, 100).replace(/\n/g, " ");
    if (result.pass) {
      log(LOG_FILE2, `${agentType}:${agentId} PASS [${result.method}]${result.warning ? ` (${result.warning})` : ""}`);
      logEvent({
        event: "verify",
        agent: agentType,
        id: agentId,
        result: "pass",
        method: result.method,
        outputLen: output.length,
        outputPreview
      });
      clearRetries(agentId);
      process.exit(0);
    }
    setRetries(agentId, retries + 1);
    const feedback = (result.issues?.length ?? 0) > 0 ? `Issues:
- ${result.issues.join("\n- ")}

Fix: ${result.suggestion}` : result.suggestion ?? "Output incomplete";
    log(LOG_FILE2, `${agentType}:${agentId} FAIL [${result.method}] (${retries + 1}/${MAX_RETRIES}): ${result.issues?.join(", ")}`);
    logEvent({
      event: "verify",
      agent: agentType,
      id: agentId,
      result: "fail",
      method: result.method,
      issues: result.issues,
      suggestion: result.suggestion,
      retry: retries + 1,
      outputLen: output.length,
      outputPreview
    });
    console.log(JSON.stringify({
      decision: "block",
      reason: `<system-reminder>
[${retries + 1}/${MAX_RETRIES}] ${feedback}
</system-reminder>`
    }));
    process.exit(0);
  } catch (e) {
    log(LOG_FILE2, `[ERROR] ${e.message}`);
    process.exit(0);
  }
}
main();
