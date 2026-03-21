"use strict";

// src/hooks/error-logger.ts
var import_fs2 = require("fs");
var import_path2 = require("path");

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

// src/hooks/error-logger.ts
function verifyWithAI(message, matchedPattern) {
  const truncated = message.length > 2e3 ? message.substring(0, 2e3) + "...[truncated]" : message;
  const prompt = `Analyze this AI assistant output and determine if it contains a REAL ERROR that occurred during execution.

MATCHED PATTERN: "${matchedPattern}"

FALSE POSITIVES to ignore:
- Discussing error handling in code/docs (e.g., "exception handling", "Error class")
- Explaining how errors work
- Code examples showing error patterns
- Listing error types or mappings
- Documentation about errors

REAL ERRORS to flag:
- Actual runtime errors that happened
- Stack traces from failed execution
- "Error:" followed by actual error message
- Failed commands or operations
- System errors (ENOENT, EACCES, etc.) from real failures

OUTPUT:
${truncated}

Respond ONLY with JSON:
{"is_real_error": true/false, "reason": "brief explanation"}`;
  try {
    const result = callHaiku(prompt);
    if (result["error"]) {
      return true;
    }
    return result["is_real_error"] === true;
  } catch {
    return true;
  }
}
function main() {
  let payload;
  try {
    payload = JSON.parse((0, import_fs2.readFileSync)(0, "utf-8"));
  } catch {
    process.exit(0);
  }
  const { last_assistant_message, stop_hook_active, session_id, cwd } = payload;
  if (stop_hook_active) {
    process.exit(0);
  }
  if (!last_assistant_message) {
    process.exit(0);
  }
  const ERROR_PATTERNS = [
    { pattern: /\bError:/i, name: "error-message" },
    { pattern: /\bexception\b/i, name: "exception" },
    { pattern: /traceback/i, name: "traceback" },
    { pattern: /ENOENT|EACCES|EPERM|ECONNREFUSED/i, name: "system-error" },
    { pattern: /\bfailed to\b/i, name: "failure" }
  ];
  const matched = ERROR_PATTERNS.find((e) => e.pattern.test(last_assistant_message));
  if (!matched) {
    process.exit(0);
  }
  const isRealError = verifyWithAI(last_assistant_message, matched.name);
  if (!isRealError) {
    process.exit(0);
  }
  const now = /* @__PURE__ */ new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 5);
  const projectRoot = cwd ?? process.cwd();
  const isClaudeDir = projectRoot.endsWith(".claude") || projectRoot.endsWith(".claude/");
  const logDir = isClaudeDir ? (0, import_path2.join)(projectRoot, "memory", "errors") : (0, import_path2.join)(projectRoot, ".claude", "memory", "errors");
  const logFile = (0, import_path2.join)(logDir, `${dateStr}-errors.md`);
  const output = {
    decision: "block",
    reason: `<system-reminder>
Error detected (${matched.name}). Log for learning:

1. Create dir: mkdir -p ${logDir}
2. Append to ${logFile}:

## ${timeStr} - [Brief Title]
- **Session**: ${session_id ?? ""}
- **Pattern**: \`${matched.name}\`
- **Context**: [What you were doing]
- **Error**: [What failed]
- **Root Cause**: [Why]
- **Resolution**: [How fixed]
- **Lesson**: [Key takeaway]

---

3. Then complete or continue.
</system-reminder>`
  };
  console.log(JSON.stringify(output));
}
main();
