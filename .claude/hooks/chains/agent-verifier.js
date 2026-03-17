#!/usr/bin/env node

/**
 * Agent Verifier - Optimized per-agent verification
 */

const fs = require('fs');
const path = require('path');
const { logEvent } = require('./chain-utils');

const CONFIG_FILE = path.join(__dirname, 'chain-config.json');
const STATE_DIR = path.join(process.env.HOME, '.claude', 'tmp', 'verifier-state');
const LOG_FILE = path.join(process.env.HOME, '.claude', 'tmp', 'agent-verifier.log');

// Load config
let CONFIG = { agents: {}, maxRetries: 2 };
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (e) {}

const MAX_RETRIES = CONFIG.maxRetries || 2;

// ============================================================
// AGENT-SPECIFIC VERIFIERS
// ============================================================

const VERIFIERS = {
  // PLANNER: Must have structure, steps, files, implementation details
  planner: (msg) => {
    const checks = {
      'markdown headers': /^#+\s.+/m.test(msg),
      'numbered steps': /(\d+\.\s|\bstep\s*\d|\bphase\s*\d)/i.test(msg),
      'file references': /[a-zA-Z0-9_\-\/]+\.(js|ts|py|go|rs|md|json|yaml|sh)\b/.test(msg),
      'min length (300)': msg.length >= 300
    };
    return checkAll(checks, 'Plan incomplete');
  },

  plan: (msg) => VERIFIERS.planner(msg),

  // PLAN-REVIEWER: Must approve OR list specific issues with suggestions
  'plan-reviewer': (msg) => {
    const m = msg.toLowerCase();
    const isApproved = /\b(approved|lgtm|looks good|ready to implement)\b/i.test(msg);

    if (isApproved) {
      // If approved, check it's not a lazy approval
      if (msg.length < 50) {
        return fail('Approval too brief. Explain what was reviewed.');
      }
      return pass();
    }

    // If not approved, must have specific issues
    const checks = {
      'specific issues listed': /(\d+\.\s.*issue|\-\s.*missing|\*\s.*problem|issue:|problem:)/i.test(msg),
      'suggestions provided': /(suggest|recommend|should|consider|fix by|instead)/i.test(msg),
      'min length (100)': msg.length >= 100
    };
    return checkAll(checks, 'Review incomplete');
  },

  // IMPLEMENTER: Must have actual code changes, not just descriptions
  implementer: (msg) => {
    const codeBlocks = msg.match(/```[\s\S]*?```/g) || [];
    const nonEmptyBlocks = codeBlocks.filter(b => b.replace(/```\w*\n?/g, '').trim().length > 10);

    const checks = {
      'code blocks present': codeBlocks.length > 0,
      'code not empty': nonEmptyBlocks.length > 0,
      'file operations': /(created|modified|updated|wrote|edited)\s+.+\.(js|ts|py|go|md)/i.test(msg) ||
                         /Write|Edit|file_path/i.test(msg),
      'min length (100)': msg.length >= 100
    };
    return checkAll(checks, 'Implementation incomplete');
  },

  // CODE-REVIEWER: Must provide meaningful review, not just "looks good"
  'code-reviewer': (msg) => {
    const m = msg.toLowerCase();
    const isApproved = /\b(approved|lgtm|no issues|looks good|code is clean)\b/i.test(msg);

    if (isApproved) {
      const checks = {
        'review explanation': msg.length >= 80,
        'aspects reviewed': /(security|performance|logic|style|error handling|tested)/i.test(msg)
      };
      return checkAll(checks, 'Approval needs explanation of what was reviewed');
    }

    // If issues found, must be specific
    const checks = {
      'specific issues': /(\d+\.\s|\-\s\[|\*\s)/.test(msg) || /(issue|bug|problem|error|fix):/i.test(msg),
      'line/file refs': /line\s*\d|:\d+|\.js|\.ts|\.py|function\s+\w+/i.test(msg),
      'min length (80)': msg.length >= 80
    };
    return checkAll(checks, 'Review needs specific issues with locations');
  },

  // TESTER: Must have actual test execution, not just "tests passed"
  tester: (msg) => {
    const checks = {
      'test output': /(✓|✅|PASS|FAIL|passed|failed|\d+\s*(test|spec)s?)/i.test(msg),
      'specific results': /(\d+\s*pass|\d+\s*fail|\d+\/\d+|100%|0 errors)/i.test(msg) ||
                          /(test results|coverage|assertions)/i.test(msg),
      'not just claim': msg.length >= 50
    };
    return checkAll(checks, 'Test report needs actual results, not just claims');
  },

  // DEBUGGER: Must identify root cause and provide solution
  debugger: (msg) => {
    const checks = {
      'root cause identified': /(root cause|because|caused by|the issue is|problem is|reason:)/i.test(msg),
      'solution provided': /(fix|solution|resolve|to fix|should be|change.*to)/i.test(msg),
      'specific location': /line\s*\d|:\d+|\.(js|ts|py)|\bfunction\b|\bclass\b/i.test(msg),
      'min length (100)': msg.length >= 100
    };
    return checkAll(checks, 'Debug needs root cause + specific solution');
  },

  // RESEARCHER: Must have findings with sources/evidence
  researcher: (msg) => {
    const checks = {
      'findings present': /(found|discovered|result|conclusion|analysis)/i.test(msg),
      'structured output': /(\d+\.\s|##\s|\-\s\*\*|options?:|approach)/i.test(msg),
      'evidence/sources': /(according to|documentation|source|reference|based on|http)/i.test(msg) ||
                          msg.length >= 300,
      'min length (200)': msg.length >= 200
    };
    return checkAll(checks, 'Research needs structured findings');
  },

  // EXPLORER: Must list actual files/directories found
  explorer: (msg) => {
    const checks = {
      'files listed': /[a-zA-Z0-9_\-\/]+\.(js|ts|py|go|md|json|yaml)\b/.test(msg),
      'paths present': /\/[a-zA-Z0-9_\-\/]+|\.\/|src\/|lib\//i.test(msg),
      'structured output': /(\d+\.\s|\-\s|├|└|│)/.test(msg),
      'min length (100)': msg.length >= 100
    };
    return checkAll(checks, 'Exploration needs file/directory listing');
  },

  // DOCS-MANAGER: Must update or create documentation
  'docs-manager': (msg) => {
    const checks = {
      'doc action': /(updated|created|modified|wrote|added to).*\.(md|rst|txt)/i.test(msg) ||
                    /(documentation|readme|docs\/)/i.test(msg),
      'content summary': msg.length >= 50
    };
    return checkAll(checks, 'Docs update needs specific files changed');
  },

  // GIT-MANAGER: Must show git operations performed
  'git-manager': (msg) => {
    const checks = {
      'git operations': /(commit|push|staged|branch|git\s)/i.test(msg),
      'commit info': /([a-f0-9]{7}|committed|pushed|created branch)/i.test(msg)
    };
    return checkAll(checks, 'Git operation needs confirmation of actions');
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function pass() {
  return { ok: true };
}

function fail(reason, failedChecks = []) {
  return { ok: false, reason, failedChecks };
}

function checkAll(checks, prefix) {
  const failed = Object.entries(checks).filter(([_, v]) => !v).map(([k]) => k);
  if (failed.length > 0) {
    return fail(`${prefix}. Missing: ${failed.join(', ')}`, failed);
  }
  return pass();
}

// Get specific retry guidance from config
function getRetryMessage(type, failedChecks) {
  const agentConfig = CONFIG.agents[type.toLowerCase()];
  if (!agentConfig?.retryGuidance?.specific) {
    return `Missing: ${failedChecks.join(', ')}`;
  }

  const guidance = failedChecks
    .map(check => agentConfig.retryGuidance.specific[check])
    .filter(Boolean)
    .join('\n- ');

  return guidance ? `Fix needed:\n- ${guidance}` : `Missing: ${failedChecks.join(', ')}`;
}

function log(msg) {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`);
}

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
  fs.writeFileSync(path.join(STATE_DIR, `${id}.json`), JSON.stringify({ r: n }));
}

function clearRetries(id) {
  const f = path.join(STATE_DIR, `${id}.json`);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

function verify(type, msg) {
  const verifier = VERIFIERS[type.toLowerCase()];
  if (!verifier) return pass(); // No rules = allow
  return verifier(msg);
}

// ============================================================
// MAIN
// ============================================================

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin);
    const type = p.agent_type || p.subagent_type || '';
    const id = p.agent_id || 'x';
    const msg = p.last_assistant_message || '';

    // Skip if already retrying
    if (p.stop_hook_active) {
      log(`${type}:${id} stop_hook_active, allow`);
      process.exit(0);
    }

    // Check retries
    const r = getRetries(id);
    if (r >= MAX_RETRIES) {
      log(`${type}:${id} max retries (${MAX_RETRIES}), allow`);
      clearRetries(id);
      process.exit(0);
    }

    // Verify with agent-specific logic
    const result = verify(type, msg);
    if (result.ok) {
      log(`${type}:${id} PASS`);
      logEvent({ event: 'verify', agent: type, id, result: 'pass' });
      clearRetries(id);
      process.exit(0);
    }

    // Block with specific guidance
    setRetries(id, r + 1);
    const specificGuidance = result.failedChecks?.length
      ? getRetryMessage(type, result.failedChecks)
      : result.reason;
    log(`${type}:${id} FAIL (${r + 1}/${MAX_RETRIES}): ${result.reason}`);
    logEvent({ event: 'verify', agent: type, id, result: 'fail', reason: result.reason, retry: r + 1 });
    console.log(JSON.stringify({ decision: "block", reason: `[${r + 1}/${MAX_RETRIES}] ${specificGuidance}` }));
    process.exit(0);

  } catch (e) {
    console.error(`[verifier] ${e.message}`);
    process.exit(0);
  }
}

main();
