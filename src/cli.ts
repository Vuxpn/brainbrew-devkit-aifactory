import { showCommand } from './commands/show.js';
import { testCommand } from './commands/test.js';
import { listCommand } from './commands/list.js';
import { activateCommand } from './commands/activate.js';
import { addCommand } from './commands/add.js';
import { createCommand } from './commands/create.js';
import { removeCommand } from './commands/remove.js';
import { linkCommand } from './commands/link.js';
import { initCommand } from './commands/init.js';
import { exportCommand } from './commands/export.js';
import { hookCommand } from './commands/hook.js';

const VERSION = '0.2.0';

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string> } {
  const args: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      args.push(arg);
    }
  }

  return { command: args[0] || 'help', args: args.slice(1), flags };
}

function printHelp(): void {
  console.log(`brainbrew v${VERSION}

Usage: brainbrew <command> [options]

Commands:
  init                          Setup hooks and runner in ~/.claude/
  show [chain]                  Display chain diagram
  list                          List available chains
  test [chain]                  Validate chain topology
  activate <chain>              Activate chain from YAML
  add --name X --after Y        Add existing agent to chain
  create --name X --prompt "P"  Create new agent + add to chain
  remove --name X               Remove agent from chain
  link --from X --to Y          Set routing between agents
  export --name N               Export current config to YAML
  hook <subcommand>             Manage hooks (global and per-project)

Hook subcommands:
  hook list                     List global hooks
  hook scaffold --name X        Create custom hook template
  hook project-list             List per-project hooks
  hook project-add --name X     Create per-project hook

Options:
  --format json|text            Output format (default: text)
  --chain <name>                Target chain (default: active)
  --help                        Show help
  --version                     Show version`);
}

async function main(): Promise<void> {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  if (flags.version) { console.log(VERSION); return; }
  if (flags.help || command === 'help') { printHelp(); return; }

  switch (command) {
    case 'init': return initCommand(flags);
    case 'show': return showCommand(args[0], flags);
    case 'list': return listCommand();
    case 'test': return testCommand(args[0], flags);
    case 'activate': return activateCommand(args[0], flags);
    case 'add': return addCommand(flags);
    case 'create': return createCommand(flags);
    case 'remove': return removeCommand(flags);
    case 'link': return linkCommand(flags);
    case 'export': return exportCommand(flags);
    case 'hook': return hookCommand(args, flags);
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
