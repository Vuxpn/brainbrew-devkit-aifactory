use std::process::Command;
use std::path::Path;

fn main() {
    let cwd = std::env::current_dir().unwrap_or_default();

    if !Path::new(".git").exists() {
        return;
    }

    let staged = run_git(&["diff", "--cached", "--stat"]);
    let unstaged = run_git(&["diff", "--stat"]);
    let branch = run_git(&["branch", "--show-current"]);
    let last_commit = run_git(&["log", "-1", "--oneline"]);

    let mut parts = vec![];

    if !branch.is_empty() {
        parts.push(format!("branch: {}", branch.trim()));
    }
    if !last_commit.is_empty() {
        parts.push(format!("last commit: {}", last_commit.trim()));
    }
    if !staged.trim().is_empty() {
        parts.push(format!("staged:\n{}", staged.trim()));
    }
    if !unstaged.trim().is_empty() {
        parts.push(format!("unstaged:\n{}", unstaged.trim()));
    }

    if parts.is_empty() {
        println!("[fast-diff] No git changes in {}", cwd.display());
    } else {
        println!("[fast-diff] {}\n{}", cwd.display(), parts.join("\n"));
    }
}

fn run_git(args: &[&str]) -> String {
    Command::new("git")
        .args(args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
}
