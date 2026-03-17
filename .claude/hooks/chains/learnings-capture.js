#!/usr/bin/env node

/**
 * Learnings Capture Hook - SubagentStop
 *
 * Uses Haiku to analyze agent output and:
 * 1. Determine if learnings exist worth noting
 * 2. If yes, check if properly documented
 * 3. Block if not documented, allow & save if documented
 *
 * Storage: $CWD/.claude/learnings.md
 */

const fs = require('fs');
const path = require('path');
const { callHaiku } = require('./ai-call-utils');

const MAX_OUTPUT_LENGTH = 4000;
const LOG_FILE = path.join(process.env.HOME, '.claude', 'tmp', 'learnings-capture.log');
const HOME = process.env.HOME;

// Track retry state to avoid infinite loops
const STATE_DIR = path.join(HOME, '.claude', 'tmp', 'learnings-state');
const MAX_RETRIES = 1;

/**
 * Validate path is within allowed base directory (prevent path traversal)
 */
function isPathSafe(targetPath, allowedBase) {
  const resolved = path.resolve(targetPath);
  const base = path.resolve(allowedBase);
  return resolved.startsWith(base + path.sep) || resolved === base;
}

function log(msg) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

function getRetries(agentId) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  try {
    const f = path.join(STATE_DIR, `${agentId}.json`);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8')).r || 0;
  } catch (e) {}
  return 0;
}

function setRetries(agentId, n) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, `${agentId}.json`), JSON.stringify({ r: n, ts: Date.now() }));
}

function clearRetries(agentId) {
  const f = path.join(STATE_DIR, `${agentId}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

function buildPrompt(output) {
  const truncated = output.length > MAX_OUTPUT_LENGTH
    ? output.substring(0, MAX_OUTPUT_LENGTH) + '\n...[truncated]'
    : output;

  return `Analyze this AI agent output for reusable learnings.

LEARNINGS TO LOOK FOR:
- [BUILD] Build/compile commands, dependencies, Node version requirements
- [DEBUG] Root causes, debugging techniques, error patterns
- [TEST] Test commands, test patterns, coverage setup
- [CONFIG] Environment variables, configuration discoveries
- [WORKAROUND] Fixes, workarounds, solutions to tricky problems
- [PATTERN] Code patterns, architecture decisions, conventions discovered

RULES:
1. Only flag as "has_learnings" if there's GENUINELY USEFUL, REUSABLE knowledge
2. Trivial changes, simple file edits, basic operations = no learnings
3. If agent already documented learnings (in any format), extract them
4. Be practical - only actionable knowledge matters

---
AGENT OUTPUT:
---
${truncated}
---

Respond ONLY with JSON:
{
  "has_learnings": true/false,
  "documented": true/false,
  "learnings": ["[TYPE] description", ...],
  "reason": "brief explanation"
}`;
}

function analyzeWithAI(output) {
  const prompt = buildPrompt(output);
  const result = callHaiku(prompt, log);

  if (result.error) {
    // On error, allow to pass (don't block on AI failure)
    return { has_learnings: false, documented: true, learnings: [], error: result.message };
  }

  log(`[AI] has_learnings=${result.has_learnings}, documented=${result.documented}, reason=${result.reason}`);
  return result;
}

function saveLearnings(cwd, agentType, agentId, learnings) {
  if (!learnings || learnings.length === 0) return;

  // Validate cwd is safe (not path traversal)
  if (!isPathSafe(cwd, HOME) && !isPathSafe(cwd, '/tmp')) {
    log(`[SECURITY] Rejected unsafe cwd: ${cwd}`);
    return;
  }

  const learningsDir = path.join(cwd, '.claude');
  const learningsFile = path.join(learningsDir, 'learnings.md');

  if (!fs.existsSync(learningsDir)) {
    fs.mkdirSync(learningsDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].substring(0, 5);

  let content = '';
  if (fs.existsSync(learningsFile)) {
    content = fs.readFileSync(learningsFile, 'utf-8');
  } else {
    content = '# Project Learnings\n\nAuto-captured from agent sessions.\n\n';
  }

  const entry = `## ${date} ${time} | ${agentType} | ${agentId.substring(0, 8)}

${learnings.map(l => `- ${l}`).join('\n')}

`;

  content += entry;
  fs.writeFileSync(learningsFile, content);
  log(`[SAVED] ${learnings.length} learnings to ${learningsFile}`);
}

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Skip if stop_hook_active to avoid recursive firing
    if (payload.stop_hook_active) {
      process.exit(0);
    }

    const agentType = payload.agent_type || '';
    const agentId = payload.agent_id || 'unknown';
    const output = payload.last_assistant_message || '';
    const cwd = payload.cwd || process.cwd();

    // Skip if no output
    if (!output || output.length < 50) {
      log(`[SKIP] ${agentType}:${agentId} - output too short`);
      process.exit(0);
    }

    // Check retry count
    const retries = getRetries(agentId);
    if (retries >= MAX_RETRIES) {
      log(`[MAX RETRY] ${agentType}:${agentId} - allowing without learnings`);
      clearRetries(agentId);
      process.exit(0);
    }

    // Analyze with AI
    const result = analyzeWithAI(output);

    // No learnings needed
    if (!result.has_learnings) {
      log(`[NO LEARNINGS] ${agentType}:${agentId} - ${result.reason}`);
      clearRetries(agentId);
      process.exit(0);
    }

    // Has learnings and documented
    if (result.documented && result.learnings?.length > 0) {
      saveLearnings(cwd, agentType, agentId, result.learnings);
      clearRetries(agentId);
      process.exit(0);
    }

    // Has learnings but not documented - block
    setRetries(agentId, retries + 1);
    log(`[BLOCK] ${agentType}:${agentId} - learnings not documented (retry ${retries + 1})`);

    // Wrap in system-reminder for higher compliance
    const blockMessage = `<system-reminder>
Before completing, please document the session learnings you discovered.

Add a section like this:

## Session Learnings
- [BUILD] any build/compile commands or requirements
- [DEBUG] root causes or debugging techniques used
- [TEST] test commands or patterns
- [CONFIG] environment/config discoveries
- [WORKAROUND] fixes or workarounds applied

Only include genuinely reusable knowledge. Skip trivial items.
</system-reminder>`;

    console.log(JSON.stringify({
      decision: 'block',
      reason: blockMessage
    }));
    process.exit(0);

  } catch (err) {
    log(`[ERROR] ${err.message}`);
    process.exit(0);
  }
}

main();
