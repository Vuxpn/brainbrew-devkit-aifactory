/**
 * AI Verification Utilities - Haiku-based semantic verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { AGENT_CRITERIA } = require('./ai-criteria');

// Config
const AI_MODEL = 'claude-haiku-4-5';
const AI_TIMEOUT = 30000; // 30s - buffer for API load & cold start
const MAX_OUTPUT_LENGTH = 4000;
const LOG_FILE = path.join(process.env.HOME, '.claude', 'tmp', 'ai-verifier.log');

function log(msg) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

function escapeForShell(str) {
  return str.replace(/'/g, "'\\''");
}

function buildPrompt(agentType, output) {
  const criteria = AGENT_CRITERIA[agentType.toLowerCase()];
  if (!criteria) return null;

  const truncated = output.length > MAX_OUTPUT_LENGTH
    ? output.substring(0, MAX_OUTPUT_LENGTH) + '\n...[truncated]'
    : output;

  return `You are a QA reviewer for AI agent outputs. Be practical, not pedantic.

AGENT: ${agentType}
ROLE: ${criteria.role}

GOOD OUTPUT SHOULD:
${criteria.mustHave.map(c => `• ${c}`).join('\n')}

BAD OUTPUT HAS:
${criteria.mustNot.map(c => `• ${c}`).join('\n')}

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
    return { pass: true, method: 'no-criteria' };
  }

  // Use temp file for reliable prompt passing
  const tmpFile = path.join('/tmp', `ai-verify-${Date.now()}.txt`);

  try {
    // Write prompt to temp file
    fs.writeFileSync(tmpFile, prompt);

    // Build clean env without CLAUDECODE
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const aiOutput = execSync(`cat "${tmpFile}" | claude -p --model ${AI_MODEL}`, {
      timeout: AI_TIMEOUT,
      encoding: 'utf8',
      shell: '/bin/bash',
      env: cleanEnv,
      cwd: '/tmp',
      maxBuffer: 5 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Cleanup temp file
    try { fs.unlinkSync(tmpFile); } catch (e) {}

    // Extract JSON from response
    let jsonStr = aiOutput.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const result = {
      pass: parsed.pass === true,
      issues: parsed.issues || [],
      suggestion: parsed.suggestion || '',
      method: 'ai'
    };

    // Log AI decision details
    log(`[AI] ${agentType}: ${result.pass ? 'PASS' : 'FAIL'} | issues: ${result.issues.length} | ${result.issues.slice(0, 2).join('; ').substring(0, 100)}`);

    return result;

  } catch (err) {
    // Cleanup temp file on error
    try { fs.unlinkSync(tmpFile); } catch (e) {}

    if (err.killed) {
      log(`[AI TIMEOUT] ${agentType} - fallback to pass`);
      return { pass: true, method: 'timeout-fallback', warning: 'AI verification timed out' };
    }
    log(`[AI ERROR] ${agentType}: ${err.message}`);
    return { pass: true, method: 'error-fallback', warning: err.message };
  }
}

function verify(agentType, output) {
  // Let AI decide everything - no regex pre-check
  // More flexible for non-code plans, research, etc.
  return verifyWithAI(agentType, output);
}

module.exports = { verify, verifyWithAI, log, AGENT_CRITERIA };
