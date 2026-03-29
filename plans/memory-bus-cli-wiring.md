# Plan: Wire up Memory Bus CLI Commands

## Summary

Wire up existing memory bus CLI handlers to main CLI. Handlers already exist in `src/memory/cli.ts`; only need to import and route in `src/cli.ts`.

**Estimated effort:** 30 minutes
**Risk level:** Low (existing handlers, minimal changes)

---

## Phase 1: Add Memory Command to CLI

### Step 1.1: Import memory commands

**File:** `src/cli.ts`

Add import at top:
```typescript
import { memoryCommands } from './memory/cli.js';
```

### Step 1.2: Add memory case to switch

**File:** `src/cli.ts`

Add case before `default`:
```typescript
case 'memory': return memoryCommand(args, flags);
```

### Step 1.3: Implement memoryCommand function

**File:** `src/cli.ts`

Add function (pattern matches `hookCommand`):

```typescript
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
```

---

## Phase 2: Update Main Help Text

### Step 2.1: Add memory to main help

**File:** `src/cli.ts`

In `printHelp()`, add under Commands section:

```typescript
  memory <subcommand>             Manage inter-agent memory bus
```

And add Memory subcommands section:

```typescript
Memory subcommands:
  memory add "msg" [--agent X]    Publish message to bus
  memory list [--agent X]         List messages
  memory clear [--all]            Clear messages
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/cli.ts` | Import memoryCommands, add case + handler + help |

---

## Verification

After implementation:
```bash
npm run build
npx brainbrew memory --help
npx brainbrew memory add "test message" --agent implementer
npx brainbrew memory list
npx brainbrew memory clear --all
```

---

## Edge Cases Handled

1. **Empty message** - Error with usage hint
2. **Boolean flags** - Converted from string 'true' to boolean
3. **Message with spaces** - `args.slice(1).join(' ')` captures full message
4. **No subcommand** - Shows memory help

---

## Full Implementation (Copy-Paste Ready)

```typescript
// At top of src/cli.ts, add import:
import { memoryCommands } from './memory/cli.js';

// In printHelp(), add to Commands section:
//   memory <subcommand>             Manage inter-agent memory bus
//
// And add new section:
// Memory subcommands:
//   memory add "msg" [--agent X]    Publish message to bus
//   memory list [--agent X]         List messages
//   memory clear [--all]            Clear messages

// In switch statement, add before default:
//     case 'memory': return memoryCommand(args, flags);

// Add these functions after printHelp():

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
```
