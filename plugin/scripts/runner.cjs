#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs = require("fs");
var import_path = require("path");
var import_child_process = require("child_process");
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || (0, import_path.dirname)((0, import_path.dirname)(__filename));
var PLUGIN_SCRIPTS = (0, import_path.join)(PLUGIN_ROOT, "scripts");
function parseYamlConfig(content) {
  const config = { hooks: {} };
  let currentEvent = "";
  for (const line of content.split("\n")) {
    const eventMatch = line.match(/^\s{2}(\S+):$/);
    if (eventMatch) {
      currentEvent = eventMatch[1];
      config.hooks[currentEvent] = [];
      continue;
    }
    const itemMatch = line.match(/^\s{4}-\s+(.+)/);
    if (itemMatch && currentEvent) {
      config.hooks[currentEvent].push(itemMatch[1]);
    }
  }
  return config;
}
function resolveScriptPath(script, cwd) {
  if (script.startsWith("plugin:")) {
    return (0, import_path.join)(PLUGIN_SCRIPTS, script.replace("plugin:", ""));
  }
  if (script.startsWith("./") || script.startsWith("../")) {
    return (0, import_path.join)(cwd, ".claude", "hooks", script.replace(/^\.\//, ""));
  }
  if (script.startsWith("/")) {
    return script;
  }
  return (0, import_path.join)(PLUGIN_SCRIPTS, script);
}
var DEFAULT_PLUGIN_HOOKS = {
  SessionStart: ["session-start.cjs"],
  SessionEnd: ["session-end.cjs"]
};
function loadProjectHooks(event, cwd) {
  const hooks = [];
  const defaults = DEFAULT_PLUGIN_HOOKS[event] || [];
  hooks.push(...defaults.map((h) => (0, import_path.join)(PLUGIN_SCRIPTS, h)));
  const configPath = (0, import_path.join)(cwd, ".claude", "chain-config.yaml");
  if ((0, import_fs.existsSync)(configPath)) {
    const config = parseYamlConfig((0, import_fs.readFileSync)(configPath, "utf-8"));
    const projectHooks = (config.hooks[event] || []).map((h) => resolveScriptPath(h, cwd));
    hooks.push(...projectHooks);
  }
  return hooks;
}
function runHook(hookPath, stdin) {
  if (!(0, import_fs.existsSync)(hookPath)) {
    console.error(`[runner] Hook not found: ${hookPath}`);
    return {};
  }
  try {
    const result = (0, import_child_process.execSync)(`node "${hookPath}"`, {
      input: stdin,
      encoding: "utf-8",
      timeout: 6e4,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const trimmed = result.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.decision === "block") {
          return { output: trimmed, block: true };
        }
      } catch {
      }
      return { output: trimmed };
    }
  } catch (err) {
    const e = err;
    if (e.status === 2 && e.stdout) {
      return { output: e.stdout.trim(), exit2: true };
    }
    if (e.stderr) console.error(e.stderr);
  }
  return {};
}
function main() {
  const eventArg = process.argv[2];
  if (!eventArg) {
    console.error("Usage: runner.cjs <EventName>");
    process.exit(0);
  }
  let stdin = "";
  try {
    stdin = (0, import_fs.readFileSync)(0, "utf-8").trim();
  } catch {
    process.exit(0);
  }
  if (!stdin) process.exit(0);
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(stdin);
    if (payload.cwd) cwd = payload.cwd;
  } catch {
  }
  const hooks = loadProjectHooks(eventArg, cwd);
  if (hooks.length === 0) {
    process.exit(0);
  }
  for (const hookPath of hooks) {
    const result = runHook(hookPath, stdin);
    if (result.block) {
      console.log(result.output);
      process.exit(0);
    }
    if (result.exit2) {
      console.log(result.output);
      process.exit(2);
    }
    if (result.output) {
      console.log(result.output);
    }
  }
}
main();
