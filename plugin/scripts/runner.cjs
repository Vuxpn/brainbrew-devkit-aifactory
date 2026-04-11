#!/usr/bin/env node
"use strict";

// src/hooks/runner.ts
var import_fs3 = require("fs");
var import_path4 = require("path");
var import_os2 = require("os");
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

// src/utils/state.ts
var import_fs2 = require("fs");
var import_path3 = require("path");

// src/utils/paths.ts
var import_os = require("os");
var import_path2 = require("path");
var HOME = (0, import_os.homedir)();
var CLAUDE_DIR = (0, import_path2.join)(HOME, ".claude");
var CHAINS_DIR = (0, import_path2.join)(CLAUDE_DIR, "chains");
var BACKUP_DIR = (0, import_path2.join)(CHAINS_DIR, ".backup");
var AGENTS_DIR = (0, import_path2.join)(CLAUDE_DIR, "agents");
var SKILLS_DIR = (0, import_path2.join)(CLAUDE_DIR, "skills");
var HOOKS_DIR = (0, import_path2.join)(CLAUDE_DIR, "hooks", "chains");
var CUSTOM_HOOKS_DIR = (0, import_path2.join)(HOOKS_DIR, "custom");
var TMP_DIR = (0, import_path2.join)("/tmp", "claude-chain");
var PROJECTS_DIR = (0, import_path2.join)(CLAUDE_DIR, "projects");
var SETTINGS_FILE = (0, import_path2.join)(CLAUDE_DIR, "settings.json");
var CHAIN_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "chain-config.json");
var VERIFICATION_RULES_FILE = (0, import_path2.join)(HOOKS_DIR, "verification-rules.json");
var HOOKS_CONFIG_FILE = (0, import_path2.join)(HOOKS_DIR, "hooks-config.yaml");
var CHAIN_EVENTS_LOG = (0, import_path2.join)(TMP_DIR, "chain-events.jsonl");

// src/utils/state.ts
var STATE_DIR = (0, import_path3.join)(TMP_DIR, "chain-state");
function statePath(sessionId) {
  return (0, import_path3.join)(STATE_DIR, `${sessionId}.json`);
}
function getState(sessionId) {
  if (!sessionId) return null;
  const file = statePath(sessionId);
  if (!(0, import_fs2.existsSync)(file)) return null;
  try {
    return JSON.parse((0, import_fs2.readFileSync)(file, "utf-8"));
  } catch {
    return null;
  }
}
function updateState(sessionId, updates) {
  if (!sessionId) return;
  if (!(0, import_fs2.existsSync)(STATE_DIR)) (0, import_fs2.mkdirSync)(STATE_DIR, { recursive: true });
  const current = getState(sessionId) || { previousAgents: [] };
  const merged = { ...current, ...updates };
  (0, import_fs2.writeFileSync)(statePath(sessionId), JSON.stringify(merged, null, 2));
}

// src/hooks/runner.ts
var RUNNER_LOG_DIR = "/tmp/claude-chain";
var RUNNER_LOG = (0, import_path4.join)(RUNNER_LOG_DIR, "runner.log");
function logToProject(_cwd, msg) {
  try {
    if (!(0, import_fs3.existsSync)(RUNNER_LOG_DIR)) (0, import_fs3.mkdirSync)(RUNNER_LOG_DIR, { recursive: true });
    (0, import_fs3.appendFileSync)(RUNNER_LOG, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${msg}
`);
  } catch {
  }
}
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || (0, import_path4.dirname)((0, import_path4.dirname)(__filename));
var PLUGIN_SCRIPTS = (0, import_path4.join)(PLUGIN_ROOT, "scripts");
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
    return (0, import_path4.join)(PLUGIN_SCRIPTS, script.replace("plugin:", ""));
  }
  if (script.startsWith("./") || script.startsWith("../")) {
    const resolved = (0, import_path4.resolve)((0, import_path4.join)(cwd, ".claude", "hooks", script));
    const base = (0, import_path4.resolve)((0, import_path4.join)(cwd, ".claude"));
    if (!resolved.startsWith(base)) return null;
    return resolved;
  }
  if (script.startsWith("/")) {
    return script;
  }
  return (0, import_path4.join)(PLUGIN_SCRIPTS, script);
}
function getUserHooks(event, cwd) {
  const configPath = (0, import_path4.join)(cwd, ".claude", "hooks.yaml");
  if (!(0, import_fs3.existsSync)(configPath)) return [];
  try {
    const content = (0, import_fs3.readFileSync)(configPath, "utf-8");
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
  if (!(0, import_fs3.existsSync)(hookPath)) {
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
    stdin = (0, import_fs3.readFileSync)(0, "utf-8").trim();
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
  if (eventArg === "UserPromptSubmit") {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? "";
      const message = (payload.message ?? "").toLowerCase();
      if (sessionId && (message.includes("skip chain") || message.includes("/skip-chain"))) {
        const state = getState(sessionId);
        if (state?.currentAgent) {
          const skipped = state.currentAgent;
          updateState(sessionId, { currentAgent: void 0, chainBlockCount: 0 });
          logToProject(cwd, `SKIP chain step | skipped=${skipped} | session=${sessionId}`);
        }
      }
    } catch {
    }
  }
  if (eventArg === "PreToolUse") {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? "";
      const toolName = payload.tool_name ?? "";
      const toolInput = payload.tool_input ?? {};
      if (toolName === "Agent" && sessionId) {
        const state = getState(sessionId);
        if (state?.previousAgents?.length) {
          const prev = state.previousAgents[state.previousAgents.length - 1];
          if (prev.id) {
            const prevOutputFile = (0, import_path4.join)((0, import_os2.homedir)(), ".claude", "tmp", "agent-outputs", `${prev.id}.md`);
            if ((0, import_fs3.existsSync)(prevOutputFile)) {
              const prevOutput = (0, import_fs3.readFileSync)(prevOutputFile, "utf-8");
              if (prevOutput && toolInput.prompt) {
                const injected = `${toolInput.prompt}

---

## Previous Agent Output (${prev.type})

${prevOutput}`;
                logToProject(cwd, `PreToolUse INJECT prev ${prev.type} output (${prevOutput.length} chars) into ${toolInput.subagent_type ?? "agent"} prompt
ORIGINAL INPUT: ${JSON.stringify(toolInput)}`);
                console.log(JSON.stringify({
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    updatedInput: { ...toolInput, prompt: injected }
                  }
                }));
                process.exit(0);
              }
            }
          }
        }
      }
    } catch {
    }
  }
  if (eventArg === "PreToolUse" || eventArg === "Stop") {
    try {
      const payload = JSON.parse(stdin);
      const sessionId = payload.session_id ?? "";
      const toolName = payload.tool_name ?? "";
      if (sessionId) {
        const state = getState(sessionId);
        if (state?.currentAgent) {
          const next = state.currentAgent;
          const chainContent = readActiveChainContent(cwd);
          if (chainContent) {
            const flowAgentPattern = new RegExp(`^  ${next}:`, "m");
            if (flowAgentPattern.test(chainContent)) {
              if (eventArg === "PreToolUse") {
                if (toolName === "Agent") {
                } else {
                  const blockCount = (state.chainBlockCount ?? 0) + 1;
                  updateState(sessionId, { chainBlockCount: blockCount });
                  logToProject(cwd, `PreToolUse BLOCKED ${toolName} | pending=${next} | count=${blockCount} | session=${sessionId}`);
                  let reason;
                  if (blockCount >= 3) {
                    updateState(sessionId, { currentAgent: void 0, chainBlockCount: 0 });
                    reason = `<system-reminder>
Hook blocked ${blockCount} times \u2014 releasing. Just spawn **${next}** to satisfy the chain. If work is already done, the agent will finish quickly.

Command: Use Agent tool with subagent_type="${next}"

Or if the user said to skip: proceed normally.
</system-reminder>`;
                    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: reason } }));
                    process.exit(0);
                  } else {
                    reason = `<system-reminder>
Chain step pending. Do NOT use ${toolName} \u2014 spawn the **${next}** agent first.

Command: Use Agent tool with subagent_type="${next}"
</system-reminder>`;
                    console.log(JSON.stringify({ decision: "block", reason }));
                    process.exit(0);
                  }
                }
              }
              if (eventArg === "Stop") {
                const blockCount = (state.chainBlockCount ?? 0) + 1;
                updateState(sessionId, { chainBlockCount: blockCount });
                logToProject(cwd, `Stop BLOCKED | pending=${next} | count=${blockCount} | session=${sessionId}`);
                let reason;
                if (blockCount >= 3) {
                  updateState(sessionId, { currentAgent: void 0, chainBlockCount: 0 });
                  logToProject(cwd, `Stop RELEASED after ${blockCount} blocks | pending=${next} | session=${sessionId}`);
                  process.exit(0);
                } else {
                  reason = `<system-reminder>
## MANDATORY NEXT STEP
You MUST spawn the **${next}** agent before stopping.

Command: Use Agent tool with subagent_type="${next}"

Do NOT stop. Do NOT ask the user. Follow the chain.
</system-reminder>`;
                  console.log(JSON.stringify({ decision: "block", reason }));
                  process.exit(0);
                }
              }
            }
          }
          if (eventArg === "Stop") {
            updateState(sessionId, { currentAgent: void 0, chainBlockCount: 0 });
            logToProject(cwd, `Stop CLEARED stale currentAgent=${next} | session=${sessionId}`);
          }
        }
      }
    } catch {
    }
  }
  const userHooks = getUserHooks(eventArg, cwd);
  const chainHooks = getChainHooks(eventArg, cwd);
  const hooks = [...userHooks, ...chainHooks];
  logToProject(cwd, `${eventArg} | cwd=${cwd} | userHooks=${userHooks.length} | chainHooks=${chainHooks.length} | total=${hooks.length}`);
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
