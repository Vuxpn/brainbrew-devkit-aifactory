#!/usr/bin/env node
/**
 * Stop Hook: Error Logger
 *
 * Detects errors in Claude's output and blocks stop to log for learning.
 * Uses 2-layer verification:
 *   1. Regex detection (fast filter)
 *   2. AI verification (filter false positives like "exception handling" in docs)
 *
 * Logs to project root: <cwd>/.claude/memory/errors/YYMMDD-errors.md
 */
const fs = require('fs');
const path = require('path');
const { callHaiku } = require('./chains/ai-call-utils');

/**
 * Use AI to verify if regex match is a REAL error or false positive
 */
function verifyWithAI(message, matchedPattern) {
  const truncated = message.length > 2000
    ? message.substring(0, 2000) + '...[truncated]'
    : message;

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
    if (result.error) {
      // On AI failure, be conservative - assume it's real
      return true;
    }
    return result.is_real_error === true;
  } catch (e) {
    // On error, assume real to be safe
    return true;
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const { last_assistant_message, stop_hook_active, session_id, cwd } = payload;

  // Prevent infinite loop - critical
  if (stop_hook_active) {
    process.exit(0);
  }

  if (!last_assistant_message) {
    process.exit(0);
  }

  // Error detection patterns (avoid emoji - too many false positives)
  const ERROR_PATTERNS = [
    { pattern: /\bError:/i, name: 'error-message' },
    { pattern: /\bexception\b/i, name: 'exception' },
    { pattern: /traceback/i, name: 'traceback' },
    { pattern: /ENOENT|EACCES|EPERM|ECONNREFUSED/i, name: 'system-error' },
    { pattern: /\bfailed to\b/i, name: 'failure' },
  ];

  const matched = ERROR_PATTERNS.find(e => e.pattern.test(last_assistant_message));

  if (!matched) {
    process.exit(0);
  }

  // Layer 2: AI verification to filter false positives
  const isRealError = verifyWithAI(last_assistant_message, matched.name);
  if (!isRealError) {
    process.exit(0); // False positive - skip
  }

  // Build log path - project root, not home
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const timeStr = now.toTimeString().slice(0, 5); // HH:MM
  const projectRoot = cwd || process.cwd();

  // Avoid double .claude if cwd already ends with .claude
  const isClaudeDir = projectRoot.endsWith('.claude') || projectRoot.endsWith('.claude/');
  const logDir = isClaudeDir
    ? path.join(projectRoot, 'memory', 'errors')
    : path.join(projectRoot, '.claude', 'memory', 'errors');
  const logFile = path.join(logDir, `${dateStr}-errors.md`);

  // Block and instruct - wrap in system-reminder for compliance
  const output = {
    decision: "block",
    reason: `<system-reminder>
Error detected (${matched.name}). Log for learning:

1. Create dir: mkdir -p ${logDir}
2. Append to ${logFile}:

## ${timeStr} - [Brief Title]
- **Session**: ${session_id}
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
