"use strict";

// src/hooks/session-end.ts
var import_fs3 = require("fs");

// src/memory/bus.ts
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var GLOBAL_STORE_PATH = (0, import_path.join)((0, import_os.homedir)(), ".claude", "memory", "bus.json");
var PROJECT_STORE_FILE = ".claude/memory/bus.json";
function getProjectStorePath(cwd) {
  return (0, import_path.join)(cwd, PROJECT_STORE_FILE);
}
function ensureDir(filePath) {
  const dir = (0, import_path.dirname)(filePath);
  if (!(0, import_fs.existsSync)(dir)) {
    (0, import_fs.mkdirSync)(dir, { recursive: true });
  }
}
function loadStore(path) {
  if (!(0, import_fs.existsSync)(path)) {
    return { version: 1, messages: [] };
  }
  try {
    return JSON.parse((0, import_fs.readFileSync)(path, "utf-8"));
  } catch {
    return { version: 1, messages: [] };
  }
}
function saveStore(path, store) {
  ensureDir(path);
  (0, import_fs.writeFileSync)(path, JSON.stringify(store, null, 2));
}
function clear(options = {}) {
  const path = options.global ? GLOBAL_STORE_PATH : getProjectStorePath(options.cwd || process.cwd());
  const store = loadStore(path);
  const before = store.messages.length;
  if (options.all) {
    store.messages = [];
  } else {
    store.messages = store.messages.filter((msg) => {
      if (options.target && msg.target === options.target) return false;
      if (options.agentType && msg.target === `agent:${options.agentType}`) return false;
      if (options.chainId && msg.chainId === options.chainId) return false;
      if (options.sessionId && msg.sessionId === options.sessionId) return false;
      if (options.persistence && msg.persistence === options.persistence) return false;
      return true;
    });
  }
  saveStore(path, store);
  return before - store.messages.length;
}
function clearSession(sessionId, cwd) {
  let cleared = 0;
  cleared += clear({ sessionId, cwd });
  cleared += clear({ persistence: "session", cwd });
  cleared += clear({ sessionId, global: true });
  cleared += clear({ persistence: "session", global: true });
  return cleared;
}

// src/utils/logger.ts
var import_fs2 = require("fs");
var import_path3 = require("path");

// src/utils/paths.ts
var import_os2 = require("os");
var import_path2 = require("path");
var HOME = (0, import_os2.homedir)();
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

// src/utils/logger.ts
function log(file, msg) {
  const dir = (0, import_path3.dirname)(file);
  if (!(0, import_fs2.existsSync)(dir)) (0, import_fs2.mkdirSync)(dir, { recursive: true });
  (0, import_fs2.appendFileSync)(file, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`);
}

// src/hooks/session-end.ts
var import_path4 = require("path");
var LOG_FILE = (0, import_path4.join)(TMP_DIR, "session-end.log");
function main() {
  try {
    const stdin = (0, import_fs3.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const sessionId = p.session_id ?? "";
    const cwd = p.cwd ?? process.cwd();
    if (!sessionId) {
      process.exit(0);
    }
    const cleared = clearSession(sessionId, cwd);
    log(LOG_FILE, `[SESSION END] ${sessionId} - Cleared ${cleared} messages`);
    process.exit(0);
  } catch (e) {
    console.error(`[session-end] ${e.message}`);
    process.exit(0);
  }
}
main();
