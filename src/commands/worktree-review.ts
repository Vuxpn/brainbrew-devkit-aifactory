#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { TMP_DIR } from '../utils/paths.js';
import { getState } from '../utils/state.js';
import { listWorktrees, getWorktreeDiff, mergeWorktree, removeWorktree } from '../utils/worktree.js';

function showHelp(): void {
  console.log(`
Worktree Review & Merge Utility

Usage: brainbrew worktree-review [options]

Options:
  --list                    List all active worktrees
  --status <path>           Show status of a specific worktree
  --diff <path>             Show diff for a worktree
  --merge <path>            Merge worktree into current branch
  --merge-branch <branch>   Target branch for merge (default: current)
  --keep                    Keep worktree after merge (don't delete)
  --dry-run                 Show what would be merged without applying
  --remove <path>           Remove worktree without merging
  --clean-all               Remove all worktrees
  --session <id>            Show worktree for specific session
  --help                    Show this help

Examples:
  brainbrew worktree-review --list
  brainbrew worktree-review --diff .claude/worktrees/implementer-12345
  brainbrew worktree-review --merge .claude/worktrees/implementer-12345 --keep
  brainbrew worktree-review --session abc-123 --diff
`);
}

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') args.list = true;
    else if (arg === '--help') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--clean-all') args.cleanAll = true;
    else if (arg === '--status' && argv[i + 1]) {
      args.status = argv[++i] as string;
    } else if (arg === '--diff' && argv[i + 1]) {
      args.diff = argv[++i] as string;
    } else if (arg === '--merge' && argv[i + 1]) {
      args.merge = argv[++i] as string;
    } else if (arg === '--merge-branch' && argv[i + 1]) {
      args.mergeBranch = argv[++i] as string;
    } else if (arg === '--remove' && argv[i + 1]) {
      args.remove = argv[++i] as string;
    } else if (arg === '--session' && argv[i + 1]) {
      args.session = argv[++i] as string;
    }
  }

  return args;
}

function listActiveWorktrees(): void {
  const worktrees = listWorktrees();

  if (worktrees.length === 0) {
    console.log('No active worktrees found.');
    return;
  }

  console.log('\n### Active Worktrees\n');
  console.log('| Path | Branch | HEAD |');
  console.log('|------|--------|------|');

  for (const wt of worktrees) {
    console.log(`| \`${wt.path}\` | \`${wt.branch}\` | \`${wt.head.substring(0, 7)}\` |`);
  }

  console.log('\nUse `brainbrew worktree-review --diff <path>` to review changes.');
  console.log('Use `brainbrew worktree-review --merge <path>` to merge.\n');
}

function showWorktreeStatus(path: string): void {
  if (!existsSync(path)) {
    console.error(`Error: Worktree not found: ${path}`);
    process.exit(1);
  }

  try {
    const status = execSync('git status --short', {
      cwd: path,
      encoding: 'utf-8',
    });

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: path,
      encoding: 'utf-8',
    }).trim();

    const log = execSync('git log -1 --oneline', {
      cwd: path,
      encoding: 'utf-8',
    }).trim();

    console.log(`\n### Worktree Status: ${path}\n`);
    console.log(`**Branch**: \`${branch}\``);
    console.log(`**Latest Commit**: ${log}`);
    console.log('\n**Working Tree**:\n');

    if (status.trim()) {
      console.log(status);
    } else {
      console.log('Clean working tree');
    }
    console.log();
  } catch (e) {
    console.error(`Error reading worktree status: ${(e as Error).message}`);
    process.exit(1);
  }
}

function showWorktreeDiff(path: string): void {
  if (!existsSync(path)) {
    console.error(`Error: Worktree not found: ${path}`);
    process.exit(1);
  }

  try {
    const diff = getWorktreeDiff(path);

    if (!diff.trim()) {
      console.log('No diff found (worktree may not have commits yet).');
      return;
    }

    console.log('\n### Worktree Diff\n');
    console.log(diff);
    console.log();
  } catch (e) {
    console.error(`Error reading diff: ${(e as Error).message}`);
    process.exit(1);
  }
}

function mergeWorktreeCmd(path: string, options: { keep?: boolean; dryRun?: boolean; targetBranch?: string }): void {
  if (!existsSync(path)) {
    console.error(`Error: Worktree not found: ${path}`);
    process.exit(1);
  }

  const result = mergeWorktree(path, options.targetBranch, {
    deleteAfterMerge: !options.keep,
    dryRun: options.dryRun,
  });

  if (result.success) {
    console.log(`\n✅ ${result.message}\n`);
    if (result.diff) {
      console.log('### Preview of Changes\n');
      console.log(result.diff);
      console.log();
    }
  } else {
    console.error(`\n❌ ${result.message}\n`);
    process.exit(1);
  }
}

function removeWorktreeCmd(path: string): void {
  try {
    removeWorktree(path, { force: true });
    console.log(`✅ Removed worktree: ${path}`);
  } catch (e) {
    console.error(`Error removing worktree: ${(e as Error).message}`);
    process.exit(1);
  }
}

function cleanAllWorktrees(): void {
  const worktrees = listWorktrees();

  if (worktrees.length === 0) {
    console.log('No worktrees to clean.');
    return;
  }

  console.log(`Removing ${worktrees.length} worktree(s)...\n`);

  for (const wt of worktrees) {
    try {
      removeWorktree(wt.path, { force: true });
      console.log(`✅ Removed: ${wt.path}`);
    } catch (e) {
      console.error(`❌ Failed to remove ${wt.path}: ${(e as Error).message}`);
    }
  }

  console.log('\nCleanup complete.\n');
}

function showSessionWorktree(sessionId: string): void {
  const state = getState(sessionId);

  if (!state?.worktree) {
    console.log(`No worktree found for session: ${sessionId}`);
    return;
  }

  const wt = state.worktree;
  console.log(`\n### Worktree for Session ${sessionId}\n`);
  console.log(`**Path**: \`${wt.path}\``);
  console.log(`**Branch**: \`${wt.branch}\``);
  console.log(`**Agent**: ${wt.agentType} (${wt.agentId})`);
  console.log(`**Created**: ${wt.createdAt}`);
  console.log(`**Committed**: ${wt.committed ? 'Yes' : 'No'}`);
  if (wt.commitHash) {
    console.log(`**Commit**: \`${wt.commitHash}\``);
  }
  console.log();

  if (existsSync(wt.path)) {
    console.log('Worktree is still active. Use --diff or --merge to review/apply changes.\n');
  } else {
    console.log('Worktree has been removed, but commit info is available.\n');
  }
}

export function worktreeReviewCommand(args: string[], flags: Record<string, string>): void {
  const allArgs = process.argv.slice(2);
  const parsed = parseArgsFromCli(allArgs);

  if (parsed.help || Object.keys(parsed).length === 0) {
    showHelp();
    process.exit(0);
  }

  if (parsed.list) {
    listActiveWorktrees();
    process.exit(0);
  }

  if (parsed.cleanAll) {
    cleanAllWorktrees();
    process.exit(0);
  }

  if (parsed.session && typeof parsed.session === 'string') {
    showSessionWorktree(parsed.session);
    if (parsed.diff) {
      const state = getState(parsed.session);
      if (state?.worktree?.path) {
        showWorktreeDiff(state.worktree.path);
      }
    }
    process.exit(0);
  }

  if (parsed.status && typeof parsed.status === 'string') {
    showWorktreeStatus(parsed.status);
    process.exit(0);
  }

  if (parsed.diff && typeof parsed.diff === 'string') {
    showWorktreeDiff(parsed.diff);
    process.exit(0);
  }

  if (parsed.remove && typeof parsed.remove === 'string') {
    removeWorktreeCmd(parsed.remove);
    process.exit(0);
  }

  if (parsed.merge && typeof parsed.merge === 'string') {
    mergeWorktreeCmd(parsed.merge, {
      keep: parsed.keep === true,
      dryRun: parsed.dryRun === true,
      targetBranch: typeof parsed.mergeBranch === 'string' ? parsed.mergeBranch : undefined,
    });
    process.exit(0);
  }

  showHelp();
  process.exit(1);
}

function parseArgsFromCli(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') args.list = true;
    else if (arg === '--help') args.help = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--keep') args.keep = true;
    else if (arg === '--clean-all') args.cleanAll = true;
    else if (arg === '--status' && argv[i + 1]) {
      args.status = argv[++i] as string;
    } else if (arg === '--diff' && argv[i + 1]) {
      args.diff = argv[++i] as string;
    } else if (arg === '--merge' && argv[i + 1]) {
      args.merge = argv[++i] as string;
    } else if (arg === '--merge-branch' && argv[i + 1]) {
      args.mergeBranch = argv[++i] as string;
    } else if (arg === '--remove' && argv[i + 1]) {
      args.remove = argv[++i] as string;
    } else if (arg === '--session' && argv[i + 1]) {
      args.session = argv[++i] as string;
    }
  }

  return args;
}

function main(): void {
  const args = parseArgs();

  if (args.help || Object.keys(args).length === 0) {
    showHelp();
    process.exit(0);
  }

  if (args.list) {
    listActiveWorktrees();
    process.exit(0);
  }

  if (args.cleanAll) {
    cleanAllWorktrees();
    process.exit(0);
  }

  if (args.session && typeof args.session === 'string') {
    showSessionWorktree(args.session);
    if (args.diff) {
      const state = getState(args.session);
      if (state?.worktree?.path) {
        showWorktreeDiff(state.worktree.path);
      }
    }
    process.exit(0);
  }

  if (args.status && typeof args.status === 'string') {
    showWorktreeStatus(args.status);
    process.exit(0);
  }

  if (args.diff && typeof args.diff === 'string') {
    showWorktreeDiff(args.diff);
    process.exit(0);
  }

  if (args.remove && typeof args.remove === 'string') {
    removeWorktreeCmd(args.remove);
    process.exit(0);
  }

  if (args.merge && typeof args.merge === 'string') {
    mergeWorktreeCmd(args.merge, {
      keep: args.keep === true,
      dryRun: args.dryRun === true,
      targetBranch: typeof args.mergeBranch === 'string' ? args.mergeBranch : undefined,
    });
    process.exit(0);
  }

  showHelp();
  process.exit(1);
}

main();
