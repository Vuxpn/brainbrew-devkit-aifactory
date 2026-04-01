# fast-diff

Shows git diff summary at session end using a compiled Rust binary.
Prints branch, last commit, staged and unstaged changes.

## Structure
src/main.rs          → Rust source
Cargo.toml           → build config
bin/macos/fast-diff  → pre-compiled macOS (arm64 + x86_64)
bin/linux/fast-diff  → pre-compiled Linux (x86_64)
bin/windows/fast-diff.exe → pre-compiled Windows (x86_64)

## Install steps
1. Detect platform
2. Copy matching binary from bin/{platform}/ to .claude/plugins/fast-diff/
3. chmod +x fast-diff (mac/linux)
4. Add to .claude/hooks.json:
   - Stop → .claude/plugins/fast-diff/fast-diff (or fast-diff.exe on Windows)

## Requirements
- No runtime needed — self-contained binary
- git must be in PATH

## Docker (alternative — no Rust, no binary)
If Docker is available, use hooks/run-docker.sh instead of the binary.
It pulls ghcr.io/brainbrewlabs/fast-diff and runs in the current directory.

Install with Docker:
1. chmod +x hooks/run-docker.sh
2. Add to .claude/hooks.json:
   - Stop → hooks/run-docker.sh

## Customize
If the user wants to modify this plugin (e.g. change output format, add email diff):
  cp -r <plugin-source-path> .claude/plugins/fast-diff/
Edit src/main.rs, then rebuild:
  cd .claude/plugins/fast-diff && cargo build --release
Update hooks.json to point to the locally built binary at target/release/fast-diff.

## Build from source (contributors)
cargo build --release
