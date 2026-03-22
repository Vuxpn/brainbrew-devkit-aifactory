import type { HookConfig } from './hook-constants.js';

export function parseSimpleYaml(content: string): HookConfig {
  const config: HookConfig = { hooks: {} };
  let currentEvent = '';

  for (const line of content.split('\n')) {
    const eventMatch = line.match(/^\s{2}(\w+):$/);
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

export function generateHookTemplate(name: string, event: string): string {
  return `#!/usr/bin/env node
/**
 * Hook: ${name}
 * Event: ${event}
 *
 * Contract:
 *   Input:  stdin JSON payload
 *   Output: stdout JSON (optional)
 *   Exit:   0 = pass-through, 2 = has output to inject
 *
 * Common payload fields:
 *   agent_type, agent_id, session_id, last_assistant_message, cwd
 */

const fs = require('fs');

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Skip if stop_hook_active (prevent infinite loops)
    if (payload.stop_hook_active) process.exit(0);

    // --- Your logic here ---
    const agentType = payload.agent_type || '';
    const output = payload.last_assistant_message || '';

    // Example: log to stderr (visible in debug mode)
    // console.error('[${name}] ' + agentType + ' completed');

    // To inject context into Claude's response:
    // console.log(JSON.stringify({
    //   continue: true,
    //   hookSpecificOutput: {
    //     hookEventName: "${event}",
    //     additionalContext: "Your message here"
    //   }
    // }));
    // process.exit(2);

    // Default: pass through silently
    process.exit(0);

  } catch (e) {
    console.error('[${name}] Error: ' + e.message);
    process.exit(0);
  }
}

main();
`;
}
