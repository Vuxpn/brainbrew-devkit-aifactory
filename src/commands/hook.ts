import { HOOK_EVENTS } from './hooks/hook-constants.js';
import { hookList, hookScaffold, hookAdd, hookEnable, hookDisable, hookRemove } from './hooks/hook-global.js';
import { projectHookList, projectHookAdd, projectHookRemove } from './hooks/hook-project.js';

export function hookCommand(args: string[], flags: Record<string, string>): void {
  const sub = args[0];

  switch (sub) {
    // Global hooks
    case 'list': return hookList();
    case 'scaffold': return hookScaffold(flags);
    case 'add': return hookAdd(flags);
    case 'enable': return hookEnable(flags);
    case 'disable': return hookDisable(flags);
    case 'remove': return hookRemove(flags);

    // Per-project hooks
    case 'project-list': return projectHookList(flags);
    case 'project-add': return projectHookAdd(flags);
    case 'project-remove': return projectHookRemove(flags);

    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log(`Usage: brainbrew hook <command> [options]

Global Hooks (~/.claude/hooks/chains/):
  list                             List all global hooks
  scaffold --name X --event E      Create new hook from template
  add --file path --event E        Register existing hook file
  enable --name X --event E        Enable a disabled hook
  disable --name X --event E       Disable hook without removing
  remove --name X                  Remove custom hook completely

Per-Project Hooks (~/.claude/projects/{encoded-cwd}/):
  project-list [--cwd path]        List hooks for current/specified project
  project-add --name X --event E   Create hook for current project
  project-remove --name X          Remove hook from current project

Events: ${HOOK_EVENTS.slice(0, 5).join(', ')}... (${HOOK_EVENTS.length} total)

Examples:
  brainbrew hook scaffold --name lint-check --event PostToolUse
  brainbrew hook project-add --name deploy-notify --event SubagentStop`);
}
