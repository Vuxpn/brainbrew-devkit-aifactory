import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function hasTeamNodes(cwd: string): boolean {
  const configPath = join(cwd, '.claude', 'chain-config.yaml');
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, 'utf-8');
  return /^\s+type:\s*team/m.test(content);
}

function main(): void {
  try {
    const stdin = readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const p = JSON.parse(stdin) as { cwd?: string };
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
Spawn ALL teammates — they run in parallel.

### Step 3: Wait & Synthesize
- Teammates send messages when done — these arrive automatically
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
- **DO NOT** use Agent(run_in_background) for team nodes — use TeamCreate + Agent(team_name)
- **DO NOT** skip TeamDelete after team completes
- **DO NOT** proceed until ALL teammates have reported back
- Teammates can message each other via SendMessage — they self-coordinate
- If a teammate goes idle, send it a message to wake it up`;

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: `<system-reminder>\n${context}\n</system-reminder>`,
      },
    }));
    process.exit(2);

  } catch (e: unknown) {
    console.error(`[session-start] ${(e as Error).message}`);
    process.exit(0);
  }
}

main();
