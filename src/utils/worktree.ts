import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const WORKTREE_BASE = '.claude/worktrees';

export interface WorktreeInfo {
  path: string;
  branch: string;
  agentId: string;
}

export interface WorktreeResult {
  worktree: WorktreeInfo;
  commitHash?: string;
  status: 'created' | 'committed' | 'merged' | 'removed';
}

function ensureWorktreeBase(): void {
  if (!existsSync(WORKTREE_BASE)) {
    mkdirSync(WORKTREE_BASE, { recursive: true });
  }
}

function sanitizeAgentId(agentId: string): string {
  return agentId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getCurrentBranch(): string {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  return branch;
}

function getShortSha(): string {
  const sha = execSync('git rev-parse --short HEAD', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  return sha;
}

export function createWorktree(agentType: string, agentId: string): WorktreeInfo {
  ensureWorktreeBase();

  const sanitizedId = sanitizeAgentId(agentId);
  const timestamp = Date.now();
  const branch = `worktree/${agentType}/${sanitizedId}-${timestamp}`;
  const worktreePath = join(WORKTREE_BASE, `${sanitizedId}-${timestamp}`);

  const currentBranch = getCurrentBranch();

  execSync(`git worktree add -b ${branch} "${worktreePath}"`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  return {
    path: worktreePath,
    branch,
    agentId,
  };
}

export function switchToWorktree(worktreePath: string): void {
  execSync(`git worktree list --porcelain`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
}

export function commitWorktreeChanges(
  worktreePath: string,
  message: string
): { success: boolean; commitHash?: string; error?: string } {
  try {
    execSync('git add -A', {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (!status) {
      return { success: false, error: 'No changes to commit' };
    }

    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const commitHash = execSync('git rev-parse HEAD', {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    return { success: true, commitHash };
  } catch (e) {
    return {
      success: false,
      error: (e as { stderr?: string; message: string }).stderr ?? (e as Error).message,
    };
  }
}

export function getWorktreeDiff(worktreePath: string, baseBranch?: string): string {
  const branch = getCurrentBranchFromWorktree(worktreePath);
  const base = baseBranch ?? 'main';

  try {
    const diff = execSync(`git diff ${base}..HEAD`, {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return diff;
  } catch {
    return '';
  }
}

export function mergeWorktree(
  worktreePath: string,
  targetBranch?: string,
  options: { deleteAfterMerge?: boolean; dryRun?: boolean } = {}
): { success: boolean; message: string; diff?: string } {
  const { deleteAfterMerge = true, dryRun = false } = options;

  try {
    const worktreeBranch = getCurrentBranchFromWorktree(worktreePath);
    const target = targetBranch ?? getCurrentBranch();

    if (dryRun) {
      const diff = getWorktreeDiff(worktreePath, target);
      return {
        success: true,
        message: `Dry run: Would merge ${worktreeBranch} into ${target}`,
        diff,
      };
    }

    const currentDir = process.cwd();
    process.chdir(currentDir);

    execSync(`git checkout ${target}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    execSync(`git merge ${worktreeBranch} -m "Merge worktree ${worktreeBranch}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const mergedPath = worktreePath;

    if (deleteAfterMerge) {
      removeWorktree(mergedPath, { force: true });
    }

    return {
      success: true,
      message: `Successfully merged ${worktreeBranch} into ${target}`,
    };
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    return {
      success: false,
      message: `Merge failed: ${err.stderr ?? err.message}`,
    };
  }
}

export function removeWorktree(
  worktreePath: string,
  options: { force?: boolean } = {}
): void {
  const { force = false } = options;

  try {
    const flags = force ? '-f' : '';
    execSync(`git worktree remove ${flags} "${worktreePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }
  } catch {
    if (existsSync(worktreePath)) {
      rmSync(worktreePath, { recursive: true, force: true });
    }
  }
}

export function listWorktrees(): Array<{ path: string; branch: string; head: string }> {
  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const worktrees: Array<{ path: string; branch: string; head: string }> = [];
    let current: Partial<typeof worktrees[number]> = {};

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current as typeof worktrees[number]);
        }
        current = { path: line.replace('worktree ', '').trim() };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.replace('HEAD ', '').trim();
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch ', '').trim();
      }
    }

    if (current.path) {
      worktrees.push(current as typeof worktrees[number]);
    }

    return worktrees.filter(w => w.path?.includes(WORKTREE_BASE) || w.branch?.includes('worktree/'));
  } catch {
    return [];
  }
}

export function getWorktreeStatus(worktreePath: string): {
  hasChanges: boolean;
  commitHash?: string;
  branch: string;
} {
  try {
    const branch = getCurrentBranchFromWorktree(worktreePath);

    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    let commitHash: string | undefined;
    try {
      commitHash = execSync('git rev-parse HEAD', {
        cwd: worktreePath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } catch {
      commitHash = undefined;
    }

    return {
      hasChanges: status.length > 0,
      commitHash,
      branch,
    };
  } catch {
    return {
      hasChanges: false,
      branch: 'unknown',
    };
  }
}

function getCurrentBranchFromWorktree(worktreePath: string): string {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: worktreePath,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  return branch;
}

export function initWorktreeSupport(): void {
  ensureWorktreeBase();

  const gitignorePath = join(WORKTREE_BASE, '.gitignore');
  if (!existsSync(gitignorePath)) {
    execSync('echo "*" > .claude/worktrees/.gitignore', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  }
}
