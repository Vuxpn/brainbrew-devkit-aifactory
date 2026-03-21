#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs = require("fs");
var import_path = require("path");
var import_child_process = require("child_process");
var import_os = require("os");
var PLUGIN_ROOT = (0, import_path.resolve)(__dirname, "..");
var CHAIN_HOME = PLUGIN_ROOT;
var CONFIG_FILE = (0, import_path.join)(PLUGIN_ROOT, "config", "config.yaml");
function parseConfig(content) {
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
  if (!(0, import_fs.existsSync)(CONFIG_FILE)) {
    const builtinPath = (0, import_path.join)(PLUGIN_ROOT, "scripts", `${eventArg}.cjs`);
    if ((0, import_fs.existsSync)(builtinPath)) {
      runHook(builtinPath, stdin);
    }
    process.exit(0);
  }
  const config = parseConfig((0, import_fs.readFileSync)(CONFIG_FILE, "utf-8"));
  const hooks = config.hooks[eventArg] || [];
  if (hooks.length === 0) process.exit(0);
  for (const hookPath of hooks) {
    const fullPath = hookPath.startsWith("/") ? hookPath : (0, import_path.join)(PLUGIN_ROOT, hookPath);
    if (!(0, import_fs.existsSync)(fullPath)) {
      console.error(`[runner] Hook not found: ${fullPath}`);
      continue;
    }
    try {
      const result = (0, import_child_process.execSync)(`node "${fullPath}"`, {
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
            console.log(trimmed);
            process.exit(0);
          }
        } catch {
        }
        console.log(trimmed);
      }
    } catch (err) {
      const e = err;
      if (e.status === 2 && e.stdout) {
        console.log(e.stdout.trim());
        process.exit(2);
      }
      if (e.stderr) console.error(e.stderr);
    }
  }
}
function runHook(hookPath, stdin) {
  try {
    const result = (0, import_child_process.execSync)(`node "${hookPath}"`, {
      input: stdin,
      encoding: "utf-8",
      timeout: 6e4,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"]
    });
    if (result.trim()) console.log(result.trim());
  } catch (err) {
    const e = err;
    if (e.status === 2 && e.stdout) {
      console.log(e.stdout.trim());
      process.exit(2);
    }
  }
}
main();
