#!/usr/bin/env node

/**
 * AI-based Agent Verifier (SubagentStop hook)
 *
 * Hybrid approach:
 * 1. Quick regex check (fast fail)
 * 2. AI verification via Haiku (semantic)
 * 3. Fallback to pass on timeout
 */

const fs = require('fs');
const path = require('path');
const { verify, log } = require('./ai-verify-utils');
const { logEvent } = require('./chain-utils');

const CONFIG_FILE = path.join(__dirname, 'chain-config.json');
const STATE_DIR = path.join(process.env.HOME, '.claude', 'tmp', 'verifier-state');

// Load config
let CONFIG = { agents: {}, maxRetries: 2 };
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (e) {}

const MAX_RETRIES = CONFIG.maxRetries || 2;

// State management
function getRetries(id) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  try {
    const f = path.join(STATE_DIR, `${id}.json`);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8')).r || 0;
  } catch (e) {}
  return 0;
}

function setRetries(id, n) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, `${id}.json`), JSON.stringify({ r: n, t: Date.now() }));
}

function clearRetries(id) {
  const f = path.join(STATE_DIR, `${id}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

// Main
function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin);
    const type = p.agent_type || p.subagent_type || '';
    const id = p.agent_id || 'x';
    const msg = p.last_assistant_message || '';

    // Skip if stop hook active
    if (p.stop_hook_active) {
      log(`${type}:${id} stop_hook_active, skip`);
      process.exit(0);
    }

    // Check retries
    const r = getRetries(id);
    if (r >= MAX_RETRIES) {
      log(`${type}:${id} max retries (${MAX_RETRIES}), allow`);
      clearRetries(id);
      process.exit(0);
    }

    // Verify with hybrid approach
    const result = verify(type, msg);

    const outputLen = msg.length;
    const outputPreview = msg.substring(0, 100).replace(/\n/g, ' ');

    if (result.pass) {
      log(`${type}:${id} PASS [${result.method}]${result.warning ? ` (${result.warning})` : ''}`);
      logEvent({
        event: 'verify',
        agent: type,
        id,
        result: 'pass',
        method: result.method,
        outputLen,
        outputPreview
      });
      clearRetries(id);
      process.exit(0);
    }

    // Block with AI feedback
    setRetries(id, r + 1);
    const feedback = result.issues?.length
      ? `Issues:\n- ${result.issues.join('\n- ')}\n\nFix: ${result.suggestion}`
      : result.suggestion || 'Output incomplete';

    log(`${type}:${id} FAIL [${result.method}] (${r + 1}/${MAX_RETRIES}): ${result.issues?.join(', ')}`);
    logEvent({
      event: 'verify',
      agent: type,
      id,
      result: 'fail',
      method: result.method,
      issues: result.issues,
      suggestion: result.suggestion,
      retry: r + 1,
      outputLen,
      outputPreview
    });

    console.log(JSON.stringify({
      decision: "block",
      reason: `<system-reminder>
[${r + 1}/${MAX_RETRIES}] ${feedback}
</system-reminder>`
    }));
    process.exit(0);

  } catch (e) {
    log(`[ERROR] ${e.message}`);
    console.error(`[ai-verifier] ${e.message}`);
    process.exit(0);
  }
}

main();
