#!/usr/bin/env node

/**
 * AI Call Utilities - Shared Haiku API calling for hooks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AI_MODEL = 'claude-haiku-4-5';
const AI_TIMEOUT = 30000;

/**
 * Call Haiku with a prompt, return parsed JSON response
 * @param {string} prompt - The prompt to send
 * @param {function} logFn - Optional logging function
 * @returns {object} Parsed JSON response or error object
 */
function callHaiku(prompt, logFn = () => {}) {
  // Use private temp directory to avoid TOCTOU race
  const tmpDir = fs.mkdtempSync(path.join('/tmp', 'ai-call-'));
  const tmpFile = path.join(tmpDir, 'prompt.txt');

  try {
    fs.writeFileSync(tmpFile, prompt, { mode: 0o600 });

    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const aiOutput = execSync(`cat "${tmpFile}" | claude -p --model ${AI_MODEL}`, {
      timeout: AI_TIMEOUT,
      encoding: 'utf8',
      shell: '/bin/bash',
      env: cleanEnv,
      cwd: tmpDir,
      maxBuffer: 5 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Cleanup
    try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch (e) {}

    // Extract JSON from response
    let jsonStr = aiOutput.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    return JSON.parse(jsonStr);

  } catch (err) {
    try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch (e) {}
    logFn(`[AI ERROR] ${err.message}`);

    if (err.killed) {
      return { error: 'timeout', message: 'AI verification timed out' };
    }
    return { error: 'call_failed', message: err.message };
  }
}

module.exports = { callHaiku, AI_MODEL, AI_TIMEOUT };
