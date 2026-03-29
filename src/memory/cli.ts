/**
 * CLI commands for Memory Bus
 */

import { publish, list, clear } from './bus.js';
import { MessageTarget, MessagePersistence, MessagePriority } from './types.js';

export interface MemoryAddOptions {
  target?: string;
  agent?: string;
  chain?: string;
  persistence?: string;
  priority?: string;
  once?: boolean;
  global?: boolean;
}

const VALID_PERSISTENCE = ['permanent', 'session', 'chain', 'once'];
const VALID_PRIORITY = ['low', 'normal', 'high', 'urgent'];

export function addMemory(content: string, options: MemoryAddOptions = {}): void {
  if (content.length > 2000) {
    console.error('Error: Message too long (max 2000 chars)');
    return;
  }

  let target: MessageTarget = 'global';

  if (options.agent) {
    target = `agent:${options.agent}`;
  } else if (options.chain) {
    target = `chain:${options.chain}`;
  } else if (options.target === 'next') {
    target = 'next';
  }

  const persistence: MessagePersistence = options.once
    ? 'once'
    : VALID_PERSISTENCE.includes(options.persistence || '')
      ? (options.persistence as MessagePersistence)
      : 'session';

  const priority: MessagePriority = VALID_PRIORITY.includes(options.priority || '')
    ? (options.priority as MessagePriority)
    : 'normal';

  const msg = publish(content, {
    target,
    persistence,
    priority,
    global: options.global,
  });

  console.log(`✓ Message published`);
  console.log(`  ID: ${msg.id}`);
  console.log(`  Target: ${msg.target}`);
  console.log(`  Persistence: ${msg.persistence}`);
  console.log(`  Priority: ${msg.priority}`);
}

export interface MemoryListOptions {
  agent?: string;
  chain?: string;
  global?: boolean;
}

export function listMemory(options: MemoryListOptions = {}): void {
  const messages = list({
    agentType: options.agent,
    chainId: options.chain,
    global: options.global,
  });

  if (messages.length === 0) {
    console.log('No messages in memory bus');
    return;
  }

  console.log(`\n📬 Memory Bus (${messages.length} messages)\n`);

  messages.forEach((msg, i) => {
    const priority = msg.priority === 'urgent' ? '⚠️' : msg.priority === 'high' ? '❗' : '';
    console.log(`${i + 1}. ${priority} [${msg.target}] (${msg.persistence})`);
    console.log(`   ${msg.content}`);
    console.log(`   Created: ${msg.createdAt} by ${msg.createdBy}`);
    console.log('');
  });
}

export interface MemoryClearOptions {
  agent?: string;
  chain?: string;
  session?: boolean;
  all?: boolean;
  global?: boolean;
}

export function clearMemory(options: MemoryClearOptions = {}): void {
  const cleared = clear({
    agentType: options.agent,
    chainId: options.chain,
    persistence: options.session ? 'session' : undefined,
    all: options.all,
    global: options.global,
  });

  console.log(`✓ Cleared ${cleared} messages`);
}

// Export for use in main CLI
export const memoryCommands = {
  add: addMemory,
  list: listMemory,
  clear: clearMemory,
};
