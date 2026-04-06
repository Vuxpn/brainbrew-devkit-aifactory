#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs2 = require("fs");
var import_path2 = require("path");
var import_child_process = require("child_process");

// src/utils/chain-resolver.ts
var import_fs = require("fs");
var import_path = require("path");
function resolveActiveChain(cwd) {
  const pointerPath = (0, import_path.join)(cwd, ".claude", "chain-config.yaml");
  if (!(0, import_fs.existsSync)(pointerPath)) return null;
  const content = (0, import_fs.readFileSync)(pointerPath, "utf-8");
  if (/^(flow|hooks):/m.test(content)) {
    return { configPath: pointerPath, chainName: "default", isLegacy: true };
  }
  const activeMatch = content.match(/^active:\s*(.+)/m);
  if (!activeMatch) return null;
  const active = activeMatch[1].trim();
  const dirMatch = content.match(/^chains_dir:\s*(.+)/m);
  const chainsDir = dirMatch ? dirMatch[1].trim() : ".claude/chains/";
  if (active.includes("..") || chainsDir.includes("..")) return null;
  const chainPath = (0, import_path.join)(cwd, chainsDir, `${active}.yaml`);
  const resolvedPath = (0, import_path.resolve)(chainPath);
  const expectedBase = (0, import_path.resolve)((0, import_path.join)(cwd, ".claude"));
  if (!resolvedPath.startsWith(expectedBase)) return null;
  if (!(0, import_fs.existsSync)(chainPath)) return null;
  return { configPath: chainPath, chainName: active, isLegacy: false };
}
function readActiveChainContent(cwd) {
  const resolved = resolveActiveChain(cwd);
  if (!resolved) return null;
  return (0, import_fs.readFileSync)(resolved.configPath, "utf-8");
}

// src/hooks/runner.ts
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || (0, import_path2.dirname)((0, import_path2.dirname)(__filename));
var PLUGIN_SCRIPTS = (0, import_path2.join)(PLUGIN_ROOT, "scripts");
function parseSimpleYaml(content) {
  const result = {};
  let currentKey = "";
  for (const line of content.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;
    const keyMatch = line.match(/^(\S+):\s*$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      result[currentKey] = [];
      continue;
    }
    const itemMatch = line.match(/^\s+-\s+(.+)/);
    if (itemMatch && currentKey) {
      result[currentKey].push(itemMatch[1].trim());
    }
  }
  return result;
}
function resolveScriptPath(script, cwd) {
  if (script.startsWith("plugin:")) {
    return (0, import_path2.join)(PLUGIN_SCRIPTS, script.replace("plugin:", ""));
  }
  if (script.startsWith("./") || script.startsWith("../")) {
    const resolved = (0, import_path2.resolve)((0, import_path2.join)(cwd, ".claude", "hooks", script));
    const base = (0, import_path2.resolve)((0, import_path2.join)(cwd, ".claude"));
    if (!resolved.startsWith(base)) return null;
    return resolved;
  }
  if (script.startsWith("/")) {
    return script;
  }
  return (0, import_path2.join)(PLUGIN_SCRIPTS, script);
}
function getUserHooks(event, cwd) {
  const configPath = (0, import_path2.join)(cwd, ".claude", "hooks.yaml");
  if (!(0, import_fs2.existsSync)(configPath)) return [];
  try {
    const content = (0, import_fs2.readFileSync)(configPath, "utf-8");
    const config = parseSimpleYaml(content);
    const scripts = config[event] || [];
    return scripts.map((s) => resolveScriptPath(s, cwd)).filter((p) => p !== null);
  } catch {
    return [];
  }
}
function parseChainHooksConfig(content) {
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
function getChainHooks(event, cwd) {
  const chainContent = readActiveChainContent(cwd);
  if (!chainContent) return [];
  try {
    const config = parseChainHooksConfig(chainContent);
    return (config.hooks[event] || []).map((s) => resolveScriptPath(s, cwd)).filter((p) => p !== null);
  } catch {
    return [];
  }
}
function runHook(hookPath, stdin) {
  if (!(0, import_fs2.existsSync)(hookPath)) {
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
    stdin = (0, import_fs2.readFileSync)(0, "utf-8").trim();
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
  const hooks = [
    ...getUserHooks(eventArg, cwd),
    ...getChainHooks(eventArg, cwd)
  ];
  if (hooks.length === 0) process.exit(0);
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
