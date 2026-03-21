import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

export const AI_MODEL = 'claude-haiku-4-5';
export const AI_TIMEOUT = 30000;

/**
 * Call Haiku with a prompt, return parsed JSON response.
 * Writes prompt to a private temp file to avoid shell escaping issues.
 */
export function callHaiku(
  prompt: string,
  logFn: (msg: string) => void = () => {}
): Record<string, unknown> {
  const tmpDir = mkdtempSync(join('/tmp', 'ai-call-'));
  const tmpFile = join(tmpDir, 'prompt.txt');

  try {
    writeFileSync(tmpFile, prompt, { mode: 0o600 });

    const cleanEnv = { ...process.env };
    delete cleanEnv['CLAUDECODE'];

    const aiOutput = execSync(`cat "${tmpFile}" | claude -p --model ${AI_MODEL}`, {
      timeout: AI_TIMEOUT,
      encoding: 'utf8',
      shell: '/bin/bash',
      env: cleanEnv,
      cwd: tmpDir,
      maxBuffer: 5 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as string;

    // Cleanup
    try { unlinkSync(tmpFile); rmdirSync(tmpDir); } catch { /* ignore */ }

    // Extract JSON from response
    let jsonStr = aiOutput.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    return JSON.parse(jsonStr) as Record<string, unknown>;

  } catch (err: unknown) {
    try { unlinkSync(tmpFile); rmdirSync(tmpDir); } catch { /* ignore */ }

    const error = err as NodeJS.ErrnoException & { killed?: boolean };
    logFn(`[AI ERROR] ${error.message}`);

    if (error.killed) {
      return { error: 'timeout', message: 'AI verification timed out' };
    }
    return { error: 'call_failed', message: error.message };
  }
}
