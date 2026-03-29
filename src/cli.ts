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
import { memoryCommands } from './memory/cli.js';

const VERSION = '0.2.0';

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string> } {
  const args: string[] = [];
  const flags: Record<string, string> = Object.create(null);

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

Memory subcommands:
  memory <subcommand>           Manage inter-agent memory bus
  memory add "msg" [--agent X]  Publish message to bus
  memory list [--agent X]       List messages
  memory clear [--all]          Clear messages

Options:
  --format json|text            Output format (default: text)
  --chain <name>                Target chain (default: active)
  --help                        Show help
  --version                     Show version`);
}

function memoryCommand(args: string[], flags: Record<string, string>): void {
  const sub = args[0];

  switch (sub) {
    case 'add': {
      const content = args.slice(1).join(' ');
      if (!content) {
        console.error('Usage: brainbrew memory add "message" [--agent X] [--target next] [--priority urgent] [--once]');
        process.exit(1);
      }
      return memoryCommands.add(content, {
        target: flags.target,
        agent: flags.agent,
        chain: flags.chain,
        persistence: flags.persistence,
        priority: flags.priority,
        once: flags.once === 'true',
        global: flags.global === 'true',
      });
    }
    case 'list':
      return memoryCommands.list({
        agent: flags.agent,
        chain: flags.chain,
        global: flags.global === 'true',
      });
    case 'clear':
      return memoryCommands.clear({
        agent: flags.agent,
        chain: flags.chain,
        session: flags.session === 'true',
        all: flags.all === 'true',
        global: flags.global === 'true',
      });
    default:
      printMemoryHelp();
  }
}

function printMemoryHelp(): void {
  console.log(`Usage: brainbrew memory <command> [options]

Commands:
  add "message" [options]   Publish message to memory bus
  list [options]            List messages in memory bus
  clear [options]           Clear messages from memory bus

Add options:
  --agent <name>            Target specific agent (e.g., implementer)
  --chain <name>            Target all agents in chain
  --target next             Target only the next agent
  --priority <level>        urgent|high|normal|low (default: normal)
  --persistence <type>      permanent|session|chain|once (default: session)
  --once                    Consume on first read
  --global                  Store in global bus (~/.claude/memory/)

List/Clear options:
  --agent <name>            Filter by agent
  --chain <name>            Filter by chain
  --global                  Use global bus
  --all                     Clear all (clear only)
  --session                 Clear session messages (clear only)

Examples:
  brainbrew memory add "Fix the auth bug" --agent implementer --priority urgent
  brainbrew memory add "Pass this to next agent" --target next --once
  brainbrew memory list
  brainbrew memory list --agent implementer
  brainbrew memory clear --all
  brainbrew memory clear --agent implementer`);
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
    case 'memory': return memoryCommand(args, flags);
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
