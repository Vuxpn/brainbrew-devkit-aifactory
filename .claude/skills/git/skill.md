---
name: git
description: Git operations. Use "commit" to stage & commit, "push" to commit & push, "pr" to create PR
argument-hint: [commit|push|pr] [branch]
---

# Git

Git workflow automation using `git-manager` agent.

## Modes

### Commit Mode (keyword: "commit")
Stage all files and create a commit.
**IMPORTANT: DO NOT push to remote**

Use `git-manager` agent to:
- Stage all files
- Create a meaningful commit based on changes

### Push Mode (keyword: "push")
Stage, commit and push all code in current branch.

Use `git-manager` agent to:
- Stage all files
- Create a meaningful commit based on changes
- Push to remote repository

### PR Mode (keyword: "pr" or "pull-request")
Create a pull request.

Variables:
- TO_BRANCH: $1 (defaults to `main`)
- FROM_BRANCH: $2 (defaults to current branch)

Use `git-manager` agent to create a PR from {FROM_BRANCH} to {TO_BRANCH}.

## Notes
- If `gh` command is not available, instruct user to install and authorize GitHub CLI first
