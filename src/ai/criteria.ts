export interface AgentCriteria {
  role: string;
  mustHave: string[];
  mustNot: string[];
  minLength: number;
}

export const AGENT_CRITERIA: Record<string, AgentCriteria> = {
  planner: {
    role: 'Creates actionable plans (code, research, tasks, anything)',
    mustHave: [
      'Clear structure (headers, lists, or logical flow)',
      'Specific actionable steps (not vague)',
      'Enough detail to execute without asking questions',
      'Addresses the actual request',
    ],
    mustNot: [
      'Vague statements without specifics',
      'Just a summary without action items',
      'Incomplete or cut-off output',
    ],
    minLength: 100,
  },

  plan: {
    role: 'Creates actionable plans (code, research, tasks, anything)',
    mustHave: [
      'Clear structure (headers, lists, or logical flow)',
      'Specific actionable steps',
      'Addresses the actual request',
      'Complete output (not cut off)',
    ],
    mustNot: [
      'Vague or too high-level',
      'Missing concrete next steps',
      'Incomplete output',
    ],
    minLength: 100,
  },

  'plan-reviewer': {
    role: 'Reviews plans and approves or requests changes',
    mustHave: [
      'Clear verdict: APPROVED or specific issues listed',
      'If approved: explanation of what was verified',
      'If issues: specific problems with suggestions to fix',
    ],
    mustNot: [
      'Lazy approval without explanation',
      'Vague criticism without specific issues',
      'Missing actionable feedback',
    ],
    minLength: 80,
  },

  implementer: {
    role: 'Writes actual code based on plans',
    mustHave: [
      'Actual code blocks with real implementation (not pseudocode)',
      'Evidence of file operations (created/modified files)',
      'Code follows existing patterns in codebase',
    ],
    mustNot: [
      'Just descriptions without actual code',
      'Empty or placeholder code blocks',
      'TODO comments instead of implementation',
    ],
    minLength: 100,
  },

  'code-reviewer': {
    role: 'Reviews code for quality and correctness',
    mustHave: [
      'Clear verdict: approved or issues found',
      'If approved: what aspects were reviewed (security, performance, logic)',
      'If issues: specific locations (file:line) and how to fix',
    ],
    mustNot: [
      "Just 'looks good' without substance",
      'Vague issues without locations',
      'Missing actionable feedback',
    ],
    minLength: 80,
  },

  tester: {
    role: 'Runs tests and reports results',
    mustHave: [
      'Actual test execution output (PASS/FAIL counts)',
      'Specific test results, not just claims',
      'Evidence tests were actually run',
    ],
    mustNot: [
      "Claims like 'tests passed' without output",
      'Fake or made-up test results',
      'Missing actual terminal output',
    ],
    minLength: 50,
  },

  debugger: {
    role: 'Investigates and fixes bugs',
    mustHave: [
      'Root cause identified (WHY it failed)',
      'Specific location (file, line, function)',
      'Solution or fix provided',
    ],
    mustNot: [
      'Just symptoms without root cause',
      "Vague 'something is wrong'",
      'Missing fix or next steps',
    ],
    minLength: 100,
  },

  researcher: {
    role: 'Researches topics and provides findings',
    mustHave: [
      'Structured findings with headers or lists',
      'Sources or evidence cited',
      'Clear conclusions or recommendations',
    ],
    mustNot: [
      'Unstructured wall of text',
      'Claims without sources',
      'Missing actionable insights',
    ],
    minLength: 200,
  },

  explorer: {
    role: 'Explores codebase and finds files',
    mustHave: [
      'List of files/directories found',
      'Actual paths (not hypothetical)',
      'Structured output (tree or list)',
    ],
    mustNot: [
      'No files listed',
      "Hypothetical paths that don't exist",
      'Unstructured output',
    ],
    minLength: 100,
  },

  'docs-manager': {
    role: 'Updates documentation',
    mustHave: [
      'Specific documentation files updated',
      'Summary of changes made',
    ],
    mustNot: [
      'No files mentioned',
      "Vague 'updated docs'",
    ],
    minLength: 50,
  },

  'git-manager': {
    role: 'Performs git operations',
    mustHave: [
      'Git commands executed',
      'Confirmation of actions (commit hash, branch name)',
    ],
    mustNot: [
      'No git operations shown',
      'Unclear what was done',
    ],
    minLength: 30,
  },
};
