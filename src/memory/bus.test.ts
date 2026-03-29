import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { publish, list, clear, formatForContext, subscribe } from './bus.js';
import { Message } from './types.js';

describe('Memory Bus', () => {
  const testCwd = process.cwd();

  beforeEach(() => {
    clear({ all: true, cwd: testCwd });
  });

  afterEach(() => {
    clear({ all: true, cwd: testCwd });
  });

  describe('publish', () => {
    it('stores raw content unchanged', () => {
      const rawContent = '# Header\nLine 1\nLine 2';
      const msg = publish(rawContent, { cwd: testCwd });

      expect(msg.content).toBe(rawContent);
      expect(msg.id).toBeDefined();
      expect(msg.createdAt).toBeDefined();
    });

    it('uses default values when options not provided', () => {
      const msg = publish('test', { cwd: testCwd });

      expect(msg.target).toBe('global');
      expect(msg.persistence).toBe('session');
      expect(msg.priority).toBe('normal');
    });

    it('respects provided options', () => {
      const msg = publish('urgent task', {
        target: 'agent:implementer',
        persistence: 'once',
        priority: 'urgent',
        cwd: testCwd,
      });

      expect(msg.target).toBe('agent:implementer');
      expect(msg.persistence).toBe('once');
      expect(msg.priority).toBe('urgent');
    });
  });

  describe('list', () => {
    it('returns empty array when no messages', () => {
      const messages = list({ cwd: testCwd });
      expect(messages).toEqual([]);
    });

    it('returns all messages', () => {
      publish('message 1', { cwd: testCwd });
      publish('message 2', { cwd: testCwd });

      const messages = list({ cwd: testCwd });
      expect(messages.length).toBe(2);
    });

    it('filters by agent type', () => {
      publish('for implementer', { target: 'agent:implementer', cwd: testCwd });
      publish('for tester', { target: 'agent:tester', cwd: testCwd });

      const messages = list({ agentType: 'implementer', cwd: testCwd });
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('for implementer');
    });
  });

  describe('clear', () => {
    it('clears all messages when all: true', () => {
      publish('msg 1', { cwd: testCwd });
      publish('msg 2', { cwd: testCwd });

      const cleared = clear({ all: true, cwd: testCwd });
      expect(cleared).toBe(2);
      expect(list({ cwd: testCwd })).toEqual([]);
    });

    it('clears by agent type', () => {
      publish('for impl', { target: 'agent:implementer', cwd: testCwd });
      publish('global', { cwd: testCwd });

      const cleared = clear({ agentType: 'implementer', cwd: testCwd });
      expect(cleared).toBe(1);
      expect(list({ cwd: testCwd }).length).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('consumes once-persistence messages', () => {
      publish('one-time', { persistence: 'once', cwd: testCwd });
      publish('permanent', { persistence: 'permanent', cwd: testCwd });

      const result1 = subscribe('any-agent', { cwd: testCwd });
      expect(result1.messages.length).toBe(2);
      expect(result1.consumed).toBe(1);

      const result2 = subscribe('any-agent', { cwd: testCwd });
      expect(result2.messages.length).toBe(1);
      expect(result2.messages[0].persistence).toBe('permanent');
    });

    it('filters by agent target', () => {
      publish('for impl', { target: 'agent:implementer', cwd: testCwd });
      publish('for tester', { target: 'agent:tester', cwd: testCwd });
      publish('global', { target: 'global', cwd: testCwd });

      const result = subscribe('implementer', { cwd: testCwd });
      expect(result.messages.length).toBe(2);
    });

    it('sorts by priority (urgent first)', () => {
      publish('low', { priority: 'low', cwd: testCwd });
      publish('urgent', { priority: 'urgent', cwd: testCwd });
      publish('normal', { priority: 'normal', cwd: testCwd });

      const result = subscribe('any', { cwd: testCwd });
      expect(result.messages[0].priority).toBe('urgent');
      expect(result.messages[1].priority).toBe('normal');
      expect(result.messages[2].priority).toBe('low');
    });
  });

  describe('formatForContext', () => {
    it('returns empty string for no messages', () => {
      expect(formatForContext([])).toBe('');
    });

    it('strips markdown headers from content', () => {
      const messages: Message[] = [{
        id: '1',
        content: '# Header\n## Subheader\nText',
        target: 'global',
        persistence: 'session',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
      }];

      const output = formatForContext(messages);
      expect(output).not.toContain('# Header');
      expect(output).not.toContain('## Subheader');
    });

    it('replaces newlines with spaces', () => {
      const messages: Message[] = [{
        id: '1',
        content: 'Line 1\nLine 2\n\nLine 3',
        target: 'global',
        persistence: 'session',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
      }];

      const output = formatForContext(messages);
      expect(output).not.toMatch(/\nLine 2/);
    });

    it('truncates content at 500 chars', () => {
      const longContent = 'x'.repeat(600);
      const messages: Message[] = [{
        id: '1',
        content: longContent,
        target: 'global',
        persistence: 'session',
        priority: 'normal',
        createdAt: new Date().toISOString(),
        createdBy: 'test',
      }];

      const output = formatForContext(messages);
      expect(output.length).toBeLessThan(longContent.length);
    });

    it('groups messages by priority', () => {
      const messages: Message[] = [
        { id: '1', content: 'urgent msg', target: 'global', persistence: 'session', priority: 'urgent', createdAt: '', createdBy: '' },
        { id: '2', content: 'normal msg', target: 'global', persistence: 'session', priority: 'normal', createdAt: '', createdBy: '' },
      ];

      const output = formatForContext(messages);
      expect(output).toContain('### ⚠️ URGENT');
      expect(output).toContain('### Context');
    });
  });
});
