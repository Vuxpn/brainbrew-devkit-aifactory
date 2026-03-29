---
name: docs
description: >-
  Build and manage VitePress documentation site. Trigger when user says:
  "build docs", "deploy docs", "preview docs", "update docs", "docs dev server",
  "run docs locally", "check docs build".
---

# Documentation Site

## Build Docs

```bash
npm run docs:build
```

Output: `docs/.vitepress/dist/`

## Preview Locally

```bash
npm run docs:dev
```

Opens at http://localhost:5173/brainbrew-devkit/

## Deploy to GitHub Pages

Docs auto-deploy on push to `main` when files in `docs/` change.

Manual trigger:
```bash
git add docs/ && git commit -m "docs: update" && git push
```

Or trigger via GitHub Actions UI.

## Site Structure

```
docs/
  index.md              # Landing page
  guide/                # Getting started, tutorials
  skills/               # Skill reference
  templates/            # Workflow templates
  agents/               # Agent reference
  api/                  # MCP tools, hooks
```

## Add New Page

1. Create `docs/<section>/<name>.md`
2. Add to sidebar in `docs/.vitepress/config.ts`
3. Build and verify: `npm run docs:build`

## Update Existing Page

1. Edit the `.md` file
2. Preview: `npm run docs:dev`
3. Commit and push to deploy

## Common Tasks

| Task | Command |
|------|---------|
| Dev server | `npm run docs:dev` |
| Build | `npm run docs:build` |
| Preview build | `npm run docs:preview` |
| Deploy | Push to main |
