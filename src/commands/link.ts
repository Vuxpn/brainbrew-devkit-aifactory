import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CHAINS_DIR } from '../utils/paths.js';
import { escapeRegex, escapeReplacement } from '../utils/regex.js';
import { findActiveChain } from '../utils/chain.js';

export function linkCommand(flags: Record<string, string>): void {
  const from = flags.from;
  const to = flags.to;
  const onFail = flags['on-fail'];
  const onIssues = flags['on-issues'];
  const chainName = flags.chain || findActiveChain();

  if (!from) { console.error('Required: --from <agent>'); process.exit(1); }
  if (!to && !onFail && !onIssues) {
    console.error('Required: --to <agent> or --on-fail <agent> or --on-issues <agent>');
    process.exit(1);
  }
  if (!chainName) { console.error('No active chain. Specify --chain <name>'); process.exit(1); }

  const file = join(CHAINS_DIR, `${chainName}.yaml`);
  if (!existsSync(file)) { console.error(`Chain not found: ${file}`); process.exit(1); }

  let content = readFileSync(file, 'utf-8');

  if (to) {
    content = content.replace(
      new RegExp(`(  ${escapeRegex(from)}:\\n    next: )\\S+`),
      `$1${escapeReplacement(to)}`
    );
    console.log(`Linked: ${from} → ${to}`);
  }

  if (onFail) {
    // Check if on_fail already exists
    if (content.match(new RegExp(`  ${escapeRegex(from)}:[\\s\\S]*?on_fail:`))) {
      content = content.replace(
        new RegExp(`(  ${escapeRegex(from)}:[\\s\\S]*?)on_fail: \\S+`),
        `$1on_fail: ${escapeReplacement(onFail)}`
      );
    } else {
      content = content.replace(
        new RegExp(`(  ${escapeRegex(from)}:\\n    next: \\S+\\n)`),
        `$1    on_fail: ${escapeReplacement(onFail)}\n`
      );
    }
    console.log(`Linked: ${from} --FAIL--> ${onFail}`);
  }

  if (onIssues) {
    if (content.match(new RegExp(`  ${escapeRegex(from)}:[\\s\\S]*?on_issues:`))) {
      content = content.replace(
        new RegExp(`(  ${escapeRegex(from)}:[\\s\\S]*?)on_issues: \\S+`),
        `$1on_issues: ${escapeReplacement(onIssues)}`
      );
    } else {
      content = content.replace(
        new RegExp(`(  ${escapeRegex(from)}:\\n    next: \\S+\\n)`),
        `$1    on_issues: ${escapeReplacement(onIssues)}\n`
      );
    }
    console.log(`Linked: ${from} --ISSUES--> ${onIssues}`);
  }

  writeFileSync(file, content);
}
