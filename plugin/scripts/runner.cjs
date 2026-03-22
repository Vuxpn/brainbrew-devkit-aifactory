#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs = require("fs");
var import_path = require("path");
var import_child_process = require("child_process");
var import_os = require("os");
var HOME = (0, import_os.homedir)();
var CLAUDE_DIR = (0, import_path.join)(HOME, ".claude");
var HOOKS_DIR = (0, import_path.join)(CLAUDE_DIR, "hooks", "chains");
var GLOBAL_CONFIG = (0, import_path.join)(HOOKS_DIR, "hooks-config.yaml");
var PROJECTS_DIR = (0, import_path.join)(CLAUDE_DIR, "projects");
function encodeCwd(cwd) {
  return cwd.replace(/\//g, "-");
}
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
function loadGlobalHooks(event) {
  if (!(0, import_fs.existsSync)(GLOBAL_CONFIG)) return [];
  const config = parseYamlConfig((0, import_fs.readFileSync)(GLOBAL_CONFIG, "utf-8"));
  return (config.hooks[event] || []).map(
    (h) => h.startsWith("/") ? h : (0, import_path.join)(HOOKS_DIR, h)
  );
}
function loadProjectHooks(event, cwd) {
  const projectDir = (0, import_path.join)(PROJECTS_DIR, encodeCwd(cwd));
  const configFile = (0, import_path.join)(projectDir, "chain-config.yaml");
  if (!(0, import_fs.existsSync)(configFile)) return [];
  const config = parseYamlConfig((0, import_fs.readFileSync)(configFile, "utf-8"));
  return (config.hooks[event] || []).map(
    (h) => h.startsWith("/") ? h : (0, import_path.join)(projectDir, h)
  );
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
    console.error("Usage: runner.js <EventName>");
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
  const globalHooks = loadGlobalHooks(eventArg);
  const projectHooks = loadProjectHooks(eventArg, cwd);
  const allHooks = [...globalHooks, ...projectHooks];
  if (allHooks.length === 0) {
    const builtinPath = (0, import_path.join)(HOOKS_DIR, `${eventArg.toLowerCase()}.js`);
    if ((0, import_fs.existsSync)(builtinPath)) {
      const result = runHook(builtinPath, stdin);
      if (result.output) console.log(result.output);
      if (result.exit2) process.exit(2);
    }
    process.exit(0);
  }
  for (const hookPath of allHooks) {
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
