"use strict";

// src/hooks/session-start.ts
var import_fs = require("fs");
var import_path = require("path");
function hasTeamNodes(cwd) {
  const configPath = (0, import_path.join)(cwd, ".claude", "chain-config.yaml");
  if (!(0, import_fs.existsSync)(configPath)) return false;
  const content = (0, import_fs.readFileSync)(configPath, "utf-8");
  return /^\s+type:\s*team/m.test(content);
}
function main() {
  try {
    const stdin = (0, import_fs.readFileSync)(0, "utf-8").trim();
    if (!stdin) process.exit(0);
    const p = JSON.parse(stdin);
    const cwd = p.cwd ?? process.cwd();
    if (!hasTeamNodes(cwd)) {
      process.exit(0);
    }
    const context = `## Agent Team Protocol

This chain uses **agent team** nodes. When a MANDATORY NEXT STEP says "AGENT TEAM", follow this workflow:

### Step 1: Create Team
\`\`\`
TeamCreate(team_name: "<team-node-name>", description: "<purpose>")
\`\`\`

### Step 2: Spawn Teammates
For each teammate listed in the instruction, spawn via Agent tool with \`team_name\` and \`name\`:
\`\`\`
Agent(subagent_type: "<agent-type>", team_name: "<team-name>", name: "<teammate-name>", prompt: "<teammate prompt>")
\`\`\`
Spawn ALL teammates \u2014 they run in parallel.

### Step 3: Wait & Synthesize
- Teammates send messages when done \u2014 these arrive automatically
- Wait for ALL teammates to finish
- Synthesize results from all teammates into a single assessment

### Step 4: Shutdown & Route
Send shutdown to each teammate:
\`\`\`
SendMessage(to: "<teammate-name>", message: { type: "shutdown_request" })
\`\`\`
Then clean up:
\`\`\`
TeamDelete()
\`\`\`
Then continue the chain based on routing rules provided in the MANDATORY NEXT STEP.

### Key Rules
- **DO NOT** use Agent(run_in_background) for team nodes \u2014 use TeamCreate + Agent(team_name)
- **DO NOT** skip TeamDelete after team completes
- **DO NOT** proceed until ALL teammates have reported back
- Teammates can message each other via SendMessage \u2014 they self-coordinate
- If a teammate goes idle, send it a message to wake it up`;
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `<system-reminder>
${context}
</system-reminder>`
      }
    }));
    process.exit(2);
  } catch (e) {
    console.error(`[session-start] ${e.message}`);
    process.exit(0);
  }
}
main();
