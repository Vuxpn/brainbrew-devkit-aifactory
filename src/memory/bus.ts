/**
 * Message Bus - Inter-Agent Communication
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import {
  Message,
  MessageStore,
  MessageTarget,
  MessagePersistence,
  MessagePriority,
  MessageFilter,
  ConsumeResult,
} from './types.js';

// Storage paths
const GLOBAL_STORE_PATH = join(homedir(), '.claude', 'memory', 'bus.json');
const PROJECT_STORE_FILE = '.claude/memory/bus.json';

function getProjectStorePath(cwd: string): string {
  return join(cwd, PROJECT_STORE_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadStore(path: string): MessageStore {
  if (!existsSync(path)) {
    return { version: 1, messages: [] };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { version: 1, messages: [] };
  }
}

function saveStore(path: string, store: MessageStore): void {
  ensureDir(path);
  writeFileSync(path, JSON.stringify(store, null, 2));
}

// Priority to number for sorting
const PRIORITY_ORDER: Record<MessagePriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Publish a message to the bus
 */
export function publish(
  content: string,
  options: {
    target?: MessageTarget;
    persistence?: MessagePersistence;
    priority?: MessagePriority;
    createdBy?: string;
    chainId?: string;
    sessionId?: string;
    tags?: string[];
    expiresAt?: string;
    global?: boolean;  // Store in global vs project
    cwd?: string;
  } = {}
): Message {
  const path = options.global
    ? GLOBAL_STORE_PATH
    : getProjectStorePath(options.cwd || process.cwd());

  const store = loadStore(path);

  const message: Message = {
    id: randomUUID(),
    content,
    target: options.target || 'global',
    persistence: options.persistence || 'session',
    priority: options.priority || 'normal',
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy || 'user',
    chainId: options.chainId,
    sessionId: options.sessionId,
    tags: options.tags,
    expiresAt: options.expiresAt,
  };

  store.messages.push(message);
  saveStore(path, store);

  return message;
}

/**
 * Subscribe/receive messages for an agent
 * Consumes 'once' messages automatically
 */
export function subscribe(
  agentType: string,
  options: {
    chainId?: string;
    sessionId?: string;
    cwd?: string;
  } = {}
): ConsumeResult {
  const cwd = options.cwd || process.cwd();
  const projectPath = getProjectStorePath(cwd);

  // Load both stores
  const projectStore = loadStore(projectPath);
  const globalStore = loadStore(GLOBAL_STORE_PATH);

  // Combine messages
  const allMessages = [...globalStore.messages, ...projectStore.messages];

  // Filter relevant messages
  const now = new Date().toISOString();
  const relevant = allMessages.filter(msg => {
    // Check expiration
    if (msg.expiresAt && msg.expiresAt < now) return false;

    // Check target
    if (msg.target === 'global') return true;
    if (msg.target === 'next') return true;  // Next agent consumes
    if (msg.target === `agent:${agentType}`) return true;
    if (options.chainId && msg.target === `chain:${options.chainId}`) return true;
    if (options.sessionId && msg.target === `session:${options.sessionId}`) return true;

    return false;
  });

  // Sort by priority (urgent first)
  relevant.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);

  // Consume 'once' and 'next' messages
  const toConsume = relevant.filter(
    msg => msg.persistence === 'once' || msg.target === 'next'
  );
  const consumeIds = new Set(toConsume.map(m => m.id));

  // Remove consumed from stores
  if (consumeIds.size > 0) {
    projectStore.messages = projectStore.messages.filter(m => !consumeIds.has(m.id));
    globalStore.messages = globalStore.messages.filter(m => !consumeIds.has(m.id));

    saveStore(projectPath, projectStore);
    saveStore(GLOBAL_STORE_PATH, globalStore);
  }

  return {
    messages: relevant,
    consumed: consumeIds.size,
  };
}

/**
 * List messages (without consuming)
 */
export function list(filter: MessageFilter & { cwd?: string; global?: boolean } = {}): Message[] {
  const path = filter.global
    ? GLOBAL_STORE_PATH
    : getProjectStorePath(filter.cwd || process.cwd());

  const store = loadStore(path);
  const now = new Date().toISOString();

  return store.messages.filter(msg => {
    // Expiration
    if (!filter.includeExpired && msg.expiresAt && msg.expiresAt < now) return false;

    // Target filter
    if (filter.target) {
      const targets = Array.isArray(filter.target) ? filter.target : [filter.target];
      if (!targets.includes(msg.target)) return false;
    }

    // Agent filter
    if (filter.agentType && msg.target !== `agent:${filter.agentType}`) return false;

    // Chain filter
    if (filter.chainId && msg.chainId !== filter.chainId) return false;

    // Session filter
    if (filter.sessionId && msg.sessionId !== filter.sessionId) return false;

    // Persistence filter
    if (filter.persistence && msg.persistence !== filter.persistence) return false;

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      if (!msg.tags || !filter.tags.some(t => msg.tags!.includes(t))) return false;
    }

    return true;
  });
}

/**
 * Clear messages
 */
export function clear(
  options: {
    target?: MessageTarget;
    agentType?: string;
    chainId?: string;
    sessionId?: string;
    persistence?: MessagePersistence;
    all?: boolean;
    global?: boolean;
    cwd?: string;
  } = {}
): number {
  const path = options.global
    ? GLOBAL_STORE_PATH
    : getProjectStorePath(options.cwd || process.cwd());

  const store = loadStore(path);
  const before = store.messages.length;

  if (options.all) {
    store.messages = [];
  } else {
    store.messages = store.messages.filter(msg => {
      if (options.target && msg.target === options.target) return false;
      if (options.agentType && msg.target === `agent:${options.agentType}`) return false;
      if (options.chainId && msg.chainId === options.chainId) return false;
      if (options.sessionId && msg.sessionId === options.sessionId) return false;
      if (options.persistence && msg.persistence === options.persistence) return false;
      return true;
    });
  }

  saveStore(path, store);
  return before - store.messages.length;
}

/**
 * Clear session messages (called on session end)
 */
export function clearSession(sessionId: string, cwd?: string): number {
  let cleared = 0;

  // Clear from project store
  cleared += clear({ sessionId, cwd });
  cleared += clear({ persistence: 'session', cwd });

  // Clear from global store
  cleared += clear({ sessionId, global: true });
  cleared += clear({ persistence: 'session', global: true });

  return cleared;
}

/**
 * Clear chain messages (called on chain completion)
 */
export function clearChain(chainId: string, cwd?: string): number {
  let cleared = 0;

  cleared += clear({ chainId, cwd });
  cleared += clear({ persistence: 'chain', cwd });

  cleared += clear({ chainId, global: true });
  cleared += clear({ persistence: 'chain', global: true });

  return cleared;
}

function sanitizeContent(content: string): string {
  return content
    .replace(/^#+/gm, '')
    .replace(/\n+/g, ' ')
    .slice(0, 500);
}

export function formatForContext(messages: Message[]): string {
  if (messages.length === 0) return '';

  const priorityGroups: Record<string, Message[]> = {
    urgent: [],
    high: [],
    normal: [],
    low: [],
  };

  messages.forEach(m => priorityGroups[m.priority].push(m));

  let output = '## Injected Context (Memory Bus)\n\n';

  if (priorityGroups.urgent.length > 0) {
    output += '### ⚠️ URGENT\n';
    priorityGroups.urgent.forEach(m => {
      output += `- ${sanitizeContent(m.content)}\n`;
    });
    output += '\n';
  }

  if (priorityGroups.high.length > 0) {
    output += '### High Priority\n';
    priorityGroups.high.forEach(m => {
      output += `- ${sanitizeContent(m.content)}\n`;
    });
    output += '\n';
  }

  const normalAndLow = [...priorityGroups.normal, ...priorityGroups.low];
  if (normalAndLow.length > 0) {
    output += '### Context\n';
    normalAndLow.forEach(m => {
      output += `- ${sanitizeContent(m.content)}\n`;
    });
  }

  return output.trim();
}
