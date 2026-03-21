#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs = require("fs");
var import_path = require("path");
var import_child_process = require("child_process");
var import_os = require("os");
function encodePath(absPath) {
  return absPath.replace(/\//g, "-");
}
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
function getProjectHooks(stdin, eventName) {
  try {
    var payload = JSON.parse(stdin);
    var cwd = payload.cwd || process.cwd();
    var encoded = encodePath(cwd);
    var home = (0, import_os.homedir)();
    var projectConfigDir = (0, import_path.join)(home, ".claude", "projects", encoded);
    var projectConfigFile = (0, import_path.join)(projectConfigDir, "chain-config.yaml");
    if (!(0, import_fs.existsSync)(projectConfigFile)) return [];
    var projectConfig = parseConfig((0, import_fs.readFileSync)(projectConfigFile, "utf-8"));
    var hooks = projectConfig.hooks[eventName] || [];
    return hooks.map(function(h) {
      if (h.startsWith("/")) return h;
      return (0, import_path.join)(projectConfigDir, h);
    });
  } catch (err) {
    console.error("[runner] Failed to load project hooks: " + err.message);
    return [];
  }
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
    var projectHooksFallback = getProjectHooks(stdin, eventArg);
    for (var i = 0; i < projectHooksFallback.length; i++) {
      if ((0, import_fs.existsSync)(projectHooksFallback[i])) {
        runHook(projectHooksFallback[i], stdin);
      }
    }
    process.exit(0);
  }
  const config = parseConfig((0, import_fs.readFileSync)(CONFIG_FILE, "utf-8"));
  const pluginHooks = config.hooks[eventArg] || [];
  var resolvedPluginHooks = pluginHooks.map(function(h) {
    return h.startsWith("/") ? h : (0, import_path.join)(PLUGIN_ROOT, h);
  });
  var projectHooks = getProjectHooks(stdin, eventArg);
  var allHooks = resolvedPluginHooks.concat(projectHooks);
  if (allHooks.length === 0) process.exit(0);
  for (var i = 0; i < allHooks.length; i++) {
    const fullPath = allHooks[i];
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
