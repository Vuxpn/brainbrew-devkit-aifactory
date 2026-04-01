# Pre-compiled binaries

Binaries are built via CI and committed here so users don't need Rust installed.

| Platform | Path | Target |
|----------|------|--------|
| macOS | bin/macos/fast-diff | aarch64-apple-darwin + x86_64-apple-darwin (universal) |
| Linux | bin/linux/fast-diff | x86_64-unknown-linux-gnu |
| Windows | bin/windows/fast-diff.exe | x86_64-pc-windows-msvc |

To rebuild: `cargo build --release` then copy from `target/release/`.
