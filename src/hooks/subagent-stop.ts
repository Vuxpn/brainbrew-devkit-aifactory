import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { verify, getRetries, setRetries, clearRetries, MAX_RETRIES } from '../ai/verifier.js';
import { log, logEvent } from '../utils/logger.js';
import { TMP_DIR } from '../utils/paths.js';
import { getState, updateState } from '../utils/state.js';
import { getWorktreeStatus, commitWorktreeChanges } from '../utils/worktree.js';

const LOG_FILE = join(TMP_DIR, 'subagent-stop.log');

interface WorktreeState {
  path: string;
  branch: string;
  agentId: string;
  agentType: string;
  createdAt: string;
  committed?: boolean;
  commitHash?: string;
}

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
      session_id?: string;
    };

    if (payload.stop_hook_active) {
      log(LOG_FILE, `[SKIP] stop_hook_active`);
      process.exit(0);
    }

    const agentType = payload.agent_type ?? payload.subagent_type ?? '';
    const agentId = payload.agent_id ?? 'x';
    const sessionId = payload.session_id ?? '';
    const output = payload.last_assistant_message ?? '';

    const state = getState(sessionId);
    const worktree = state?.worktree;

    let worktreeInfo: { path?: string; branch?: string; commitHash?: string; status?: string } = {};

    if (worktree && worktree.agentId === agentId) {
      const wtStatus = getWorktreeStatus(worktree.path);

      if (wtStatus.hasChanges && !wtStatus.commitHash) {
        log(LOG_FILE, `${agentType}:${agentId} has uncommitted changes in worktree`);

        const commitMessage = `${agentType}: ${agentId} - Auto-committed changes`;
        const commitResult = commitWorktreeChanges(worktree.path, commitMessage);

        if (commitResult.success && commitResult.commitHash) {
          updateState(sessionId, {
            worktree: {
              ...worktree,
              committed: true,
              commitHash: commitResult.commitHash,
            },
          });

          worktreeInfo = {
            path: worktree.path,
            branch: worktree.branch,
            commitHash: commitResult.commitHash,
            status: 'committed',
          };

          log(LOG_FILE, `[WORKTREE] Auto-commited: ${commitResult.commitHash}`);
          logEvent({
            event: 'worktree-committed',
            agent: agentType,
            id: agentId,
            commitHash: commitResult.commitHash,
          });
        } else {
          log(LOG_FILE, `[WORKTREE] Auto-commit failed: ${commitResult.error}`);
        }
      } else if (wtStatus.commitHash) {
        worktreeInfo = {
          path: worktree.path,
          branch: worktree.branch,
          commitHash: wtStatus.commitHash,
          status: 'committed',
        };
      } else {
        worktreeInfo = {
          path: worktree.path,
          branch: worktree.branch,
          status: 'no-changes',
        };
      }
    }

    const retries = getRetries(agentId);
    if (retries >= MAX_RETRIES) {
      log(LOG_FILE, `${agentType}:${agentId} max retries (${MAX_RETRIES}), allow`);
      clearRetries(agentId);
      process.exit(0);
    }

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
        worktree: worktreeInfo,
      });
      clearRetries(agentId);

      if (worktree) {
        const enhancedOutput = output + `\n\n### Worktree Info
- **Path**: \`${worktreeInfo.path}\`
- **Branch**: \`${worktreeInfo.branch}\`
- **Commit**: \`${worktreeInfo.commitHash ?? 'N/A'}\`
- **Status**: ${worktreeInfo.status ?? 'unknown'}

To review changes:
\`\`\`bash
cd ${worktreeInfo.path}
git diff HEAD
\`\`\`

To merge (if needed):
\`\`\`bash
git merge ${worktreeInfo.branch}
\`\`\`
`;
        console.log(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'SubagentStop',
            additionalContext: `<system-reminder>\n## Worktree Isolation Complete\n\n${enhancedOutput}\n</system-reminder>`,
          },
        }));
        process.exit(0);
      }

      process.exit(0);
    }

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
