#!/usr/bin/env node

/**
 * Chain Utils - Shared utilities for agent chain hooks
 *
 * Provides:
 * - Payload parsing from stdin
 * - Iteration tracking
 * - Context injection helpers
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// State file for tracking iterations (outside repo to avoid git noise)
const STATE_DIR = path.join(os.homedir(), '.claude', 'tmp', 'chain-state');
const LOG_FILE = path.join(os.homedir(), '.claude', 'tmp', 'chain-events.jsonl');
const MAX_ITERATIONS = 3;

/**
 * Log event to unified JSONL file
 */
function logEvent(event) {
  const entry = {
    ts: new Date().toISOString(),
    ...event
  };
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Get state file path for a session
 */
function getStatePath(sessionId) {
  return path.join(STATE_DIR, `${sessionId}.json`);
}

/**
 * Get state for a session
 */
function getState(sessionId) {
  try {
    const p = getStatePath(sessionId);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {}
  return null;
}

/**
 * Set state for a session
 */
function setState(sessionId, state) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(getStatePath(sessionId), JSON.stringify(state, null, 2));
}

/**
 * Update state for a session (merge with existing)
 */
function updateState(sessionId, updates) {
  const state = getState(sessionId) || { sessionId, createdAt: new Date().toISOString(), previousAgents: [] };
  Object.assign(state, updates);
  setState(sessionId, state);
  return state;
}

/**
 * Parse hook payload from stdin
 */
function parsePayload() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) {
      console.error(`[chain-utils] Empty stdin`);
      return null;
    }
    const payload = JSON.parse(stdin);
    // DEBUG: Log what we received
    console.error(`[chain-utils] Received agent_type=${payload.agent_type}, subagent_type=${payload.subagent_type}`);
    return payload;
  } catch (e) {
    console.error(`[chain-utils] Failed to parse payload: ${e.message}`);
    return null;
  }
}

/**
 * Get iteration count for a chain
 */
function getIterationCount(chainId) {
  const stateFile = path.join(STATE_DIR, `${chainId}.json`);
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      return state.iterations || 0;
    }
  } catch (e) {
    // Ignore read errors
  }
  return 0;
}

/**
 * Increment iteration count for a chain
 */
function incrementIteration(chainId) {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  const stateFile = path.join(STATE_DIR, `${chainId}.json`);
  const count = getIterationCount(chainId) + 1;
  fs.writeFileSync(stateFile, JSON.stringify({
    iterations: count,
    updatedAt: new Date().toISOString()
  }));
  return count;
}

/**
 * Reset iteration count for a chain
 */
function resetIteration(chainId) {
  const stateFile = path.join(STATE_DIR, `${chainId}.json`);
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

/**
 * Check if max iterations reached
 */
function isMaxIterations(chainId) {
  return getIterationCount(chainId) >= MAX_ITERATIONS;
}

/**
 * Output context injection for Claude
 */
function injectContext(message, options = {}) {
  // DEBUG: Log to stderr to verify hook is running
  console.error(`[chain-hook] SubagentStop triggered - injecting context`);

  const output = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SubagentStop",
      additionalContext: message
    }
  };
  console.log(JSON.stringify(output));
}

/**
 * Output blocking response (rare, use carefully)
 */
function blockWithMessage(message) {
  const output = {
    continue: false,
    message: message
  };
  console.log(JSON.stringify(output));
}

/**
 * Check if message indicates approval (for code/plan review)
 */
function checkApproval(message) {
  if (!message) return false;
  const lowerMsg = message.toLowerCase();

  const approvalPatterns = [
    'approved', 'lgtm', 'looks good', 'no issues found',
    'code is clean', 'ready for testing', 'no critical issues',
    'plan is complete', 'ready for implementation', 'ready to implement',
    'review passed', '✅ approved', '✅ lgtm', '✅'
  ];

  const rejectionPatterns = [
    'not approved', 'issues found', 'needs fix', 'needs improvement',
    'must fix', 'critical issue', 'has bug', 'has error', 'missing',
    'incorrect', 'security vulnerability', 'blocking issue',
    'required changes', '❌', '⚠️', 'needs work'
  ];

  const hasApproval = approvalPatterns.some(p => lowerMsg.includes(p));
  const hasRejection = rejectionPatterns.some(p => lowerMsg.includes(p));

  return hasApproval && !hasRejection;
}

/**
 * Check if tests passed
 */
function checkTestsPassed(message) {
  if (!message) return false;
  const lowerMsg = message.toLowerCase();

  const passPatterns = [
    'all tests pass', 'tests passed', 'test passed', 'all passed',
    '100%', '0 failures', '0 failed', 'no failures', 'success',
    '✅ tests', '✅ passed', 'tests: passed'
  ];

  const failPatterns = [
    'test failed', 'tests failed', 'failed:', 'failures:',
    'failing test', 'broken test', '❌', 'test error',
    'assertion failed', 'expect failed'
  ];

  const hasPassed = passPatterns.some(p => lowerMsg.includes(p));
  const hasFailed = failPatterns.some(p => lowerMsg.includes(p));

  return hasPassed && !hasFailed;
}

module.exports = {
  parsePayload,
  getIterationCount,
  incrementIteration,
  resetIteration,
  isMaxIterations,
  injectContext,
  blockWithMessage,
  checkApproval,
  checkTestsPassed,
  logEvent,
  getState,
  setState,
  updateState,
  MAX_ITERATIONS
};
