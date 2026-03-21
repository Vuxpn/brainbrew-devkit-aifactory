import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { verify, getRetries, setRetries, clearRetries, MAX_RETRIES } from '../ai/verifier.js';
import { log, logEvent } from '../utils/logger.js';
import { TMP_DIR } from '../utils/paths.js';

const LOG_FILE = join(TMP_DIR, 'subagent-stop.log');

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  try {
    const stdin = readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin) as {
      stop_hook_active?: boolean;
      agent_type?: string;
      subagent_type?: string;
      agent_id?: string;
      last_assistant_message?: string;
    };

    if (payload.stop_hook_active) {
      log(LOG_FILE, `[SKIP] stop_hook_active`);
      process.exit(0);
    }

    const agentType = payload.agent_type ?? payload.subagent_type ?? '';
    const agentId = payload.agent_id ?? 'x';
    const output = payload.last_assistant_message ?? '';

    // Check retries
    const retries = getRetries(agentId);
    if (retries >= MAX_RETRIES) {
      log(LOG_FILE, `${agentType}:${agentId} max retries (${MAX_RETRIES}), allow`);
      clearRetries(agentId);
      process.exit(0);
    }

    // Verify output quality
    const result = verify(agentType, output);
    const outputPreview = output.substring(0, 100).replace(/\n/g, ' ');

    if (result.pass) {
      log(LOG_FILE, `${agentType}:${agentId} PASS [${result.method}]${result.warning ? ` (${result.warning})` : ''}`);
      logEvent({
        event: 'verify',
        agent: agentType,
        id: agentId,
        result: 'pass',
        method: result.method,
        outputLen: output.length,
        outputPreview,
      });
      clearRetries(agentId);
      process.exit(0);
    }

    // Block with feedback
    setRetries(agentId, retries + 1);
    const feedback = (result.issues?.length ?? 0) > 0
      ? `Issues:\n- ${result.issues!.join('\n- ')}\n\nFix: ${result.suggestion}`
      : result.suggestion ?? 'Output incomplete';

    log(LOG_FILE, `${agentType}:${agentId} FAIL [${result.method}] (${retries + 1}/${MAX_RETRIES}): ${result.issues?.join(', ')}`);
    logEvent({
      event: 'verify',
      agent: agentType,
      id: agentId,
      result: 'fail',
      method: result.method,
      issues: result.issues,
      suggestion: result.suggestion,
      retry: retries + 1,
      outputLen: output.length,
      outputPreview,
    });

    console.log(JSON.stringify({
      decision: 'block',
      reason: `<system-reminder>\n[${retries + 1}/${MAX_RETRIES}] ${feedback}\n</system-reminder>`,
    }));
    process.exit(0);

  } catch (e: unknown) {
    log(LOG_FILE, `[ERROR] ${(e as Error).message}`);
    process.exit(0);
  }
}

main();
