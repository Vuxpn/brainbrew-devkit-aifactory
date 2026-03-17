#!/usr/bin/env node

/**
 * Coding Chain Messages - Message templates for coding workflow
 */

const banner = (icon, title) => [
  '',
  '═══════════════════════════════════════════════════════════════',
  `${icon}  AGENT CHAIN: ${title}`,
  '═══════════════════════════════════════════════════════════════'
].join('\n');

const footer = '═══════════════════════════════════════════════════════════════\n';

module.exports = {
  implementer: {
    review: () => [
      banner('⚠️', 'CODE REVIEW REQUIRED'),
      '',
      'Implementation complete. You MUST now run `code-reviewer` agent.',
      '',
      'Review scope: quality, error handling, security, performance.',
      '',
      'DO NOT proceed to testing without code review approval.',
      footer
    ].join('\n')
  },

  codeReviewer: {
    passed: () => [
      banner('✅', 'CODE REVIEW PASSED'),
      '',
      'Code review passed.',
      '',
      'IF implementing (cook/code/fix): Run `tester` agent next.',
      'IF standalone review: Report findings to user.',
      footer
    ].join('\n'),

    maxIterations: (max) => [
      banner('⚠️', 'MAX REVIEW ITERATIONS REACHED'),
      '',
      `Code review loop reached ${max} iterations.`,
      '',
      'Options:',
      '1. Proceed with current code (document known issues)',
      '2. Ask user for guidance on blocking issues',
      '3. Consider alternative implementation approach',
      footer
    ].join('\n'),

    needsFix: (count, max) => [
      banner('🔄', `CODE ISSUES FOUND (Iteration ${count}/${max})`),
      '',
      'Code reviewer found issues.',
      '',
      'IF implementing (cook/code/fix):',
      '  → Run `implementer` to fix, then re-review',
      '',
      'IF standalone review:',
      '  → Report issues to user with improvement plan',
      footer
    ].join('\n')
  },

  tester: {
    passed: () => [
      banner('✅', 'TESTS PASSED → UPDATE DOCS'),
      '',
      'All tests passed.',
      '',
      'You MUST now run `docs-manager` agent to update documentation.',
      '',
      'DO NOT skip documentation updates.',
      footer
    ].join('\n'),

    failed: () => [
      banner('❌', 'TESTS FAILED → DEBUG REQUIRED'),
      '',
      'Tests failed. You MUST run `debugger` agent to investigate.',
      '',
      'Chain: debugger → implementer → code-reviewer → tester',
      '',
      'DO NOT mark task complete with failing tests.',
      footer
    ].join('\n')
  },

  debugger: {
    done: () => [
      banner('🔍', 'DEBUG COMPLETE → FIX ISSUES'),
      '',
      'Debug analysis complete.',
      '',
      'You MUST now run `implementer` agent to fix identified issues.',
      '',
      'Chain continues: implementer → code-reviewer → tester',
      footer
    ].join('\n')
  },

  docsManager: {
    done: () => [
      banner('📝', 'DOCS UPDATED → READY TO COMMIT'),
      '',
      'Documentation updated.',
      '',
      'You MUST now run `git-manager` agent to commit changes.',
      '',
      'DO NOT leave uncommitted work.',
      footer
    ].join('\n')
  },

  gitManager: {
    done: () => [
      banner('✅', 'IMPLEMENTATION COMPLETE'),
      '',
      'Full workflow complete:',
      '  ✅ Code implemented',
      '  ✅ Code reviewed',
      '  ✅ Tests passed',
      '  ✅ Docs updated',
      '  ✅ Changes committed',
      '',
      'Mark task as done.',
      footer
    ].join('\n')
  }
};
