export const HOOK_EVENTS = [
  'SessionStart', 'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest',
  'SubagentStart', 'SubagentStop',
  'Stop', 'StopFailure',
  'PreCompact', 'PostCompact',
  'Notification',
  'TeammateIdle', 'TaskCompleted',
  'ConfigChange', 'InstructionsLoaded',
  'WorktreeCreate', 'WorktreeRemove',
  'Elicitation', 'ElicitationResult',
] as const;

export type HookEvent = typeof HOOK_EVENTS[number];

export interface HookConfig {
  hooks: Record<string, string[]>;
}
