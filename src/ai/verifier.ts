import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { callHaiku } from './haiku.js';
import { AGENT_CRITERIA } from './criteria.js';
import { CHAIN_CONFIG_FILE, TMP_DIR } from '../utils/paths.js';
import { log } from '../utils/logger.js';

const MAX_OUTPUT_LENGTH = 8000;
const LOG_FILE = join(TMP_DIR, 'ai-verifier.log');
const STATE_DIR = join(TMP_DIR, 'verifier-state');

// Load max retries from config (default 2)
let MAX_RETRIES = 2;
try {
  const cfg = JSON.parse(readFileSync(CHAIN_CONFIG_FILE, 'utf-8')) as { maxRetries?: number };
  MAX_RETRIES = cfg.maxRetries ?? 2;
} catch { /* use default */ }

export interface VerifyResult {
  pass: boolean;
  issues?: string[];
  suggestion?: string;
  method: string;
  warning?: string;
}

function buildPrompt(agentType: string, output: string): string | null {
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

function verifyWithAI(agentType: string, output: string): VerifyResult {
  const prompt = buildPrompt(agentType, output);
  if (!prompt) {
    return { pass: true, method: 'no-criteria' };
  }

  try {
    const parsed = callHaiku(prompt, (msg) => log(LOG_FILE, msg));

    if (parsed['error']) {
      const errMsg = parsed['error'] as string;
      if (errMsg === 'timeout') {
        log(LOG_FILE, `[AI TIMEOUT] ${agentType} - fallback to pass`);
        return { pass: true, method: 'timeout-fallback', warning: 'AI verification timed out' };
      }
      log(LOG_FILE, `[AI ERROR] ${agentType}: ${parsed['message']}`);
      return { pass: true, method: 'error-fallback', warning: parsed['message'] as string };
    }

    const result: VerifyResult = {
      pass: parsed['pass'] === true,
      issues: (parsed['issues'] as string[]) || [],
      suggestion: (parsed['suggestion'] as string) || '',
      method: 'ai',
    };

    log(LOG_FILE, `[AI] ${agentType}: ${result.pass ? 'PASS' : 'FAIL'} | issues: ${result.issues?.length ?? 0} | ${(result.issues ?? []).slice(0, 2).join('; ').substring(0, 100)}`);
    return result;

  } catch (err: unknown) {
    const error = err as Error;
    log(LOG_FILE, `[AI ERROR] ${agentType}: ${error.message}`);
    return { pass: true, method: 'error-fallback', warning: error.message };
  }
}

export function verify(agentType: string, output: string): VerifyResult {
  return verifyWithAI(agentType, output);
}

// Retry state management for verifier

export function getRetries(agentId: string): number {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  try {
    const f = join(STATE_DIR, `${agentId}.json`);
    if (existsSync(f)) {
      const data = JSON.parse(readFileSync(f, 'utf-8')) as { r?: number };
      return data.r ?? 0;
    }
  } catch { /* ignore */ }
  return 0;
}

export function setRetries(agentId: string, n: number): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(join(STATE_DIR, `${agentId}.json`), JSON.stringify({ r: n, t: Date.now() }));
}

export function clearRetries(agentId: string): void {
  const f = join(STATE_DIR, `${agentId}.json`);
  if (existsSync(f)) unlinkSync(f);
}

export { MAX_RETRIES };
