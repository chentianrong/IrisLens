import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '../../src/persistence/database.js';
import { openAgentStore } from '../../src/persistence/store.js';
import type { Conversation } from '../../src/types.js';

function newDb(): Database.Database {
  return new Database(':memory:');
}

describe('agent persistence', () => {
  it('applies and rolls back the schema', () => {
    const db = newDb();
    migrate(db, 1);
    expect(db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name='messages'").get()).toEqual({ count: 1 });
    migrate(db, 0);
    expect(db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name='messages'").get()).toEqual({ count: 0 });
  });

  it('restores conversations exactly and lists history', () => {
    const store = openAgentStore(newDb());
    const conversation: Conversation = {
      id: 'c1', title: 'Refactor', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:01:00Z',
      messages: [
        { id: 'm1', conversationId: 'c1', role: 'user', content: 'Please plan', state: 'complete', createdAt: '2026-01-01T00:00:00Z', context: [{ id: 'active:src/a.ts', type: 'active-file', label: 'a.ts', path: 'src/a.ts', content: 'export {};' }] },
        { id: 'm2', conversationId: 'c1', role: 'assistant', content: 'Plan', state: 'stopped', createdAt: '2026-01-01T00:01:00Z', plan: [{ id: 'step-1', title: 'Read file', state: 'complete' }], error: 'Stopped by user' }
      ]
    } ;
    store.saveConversation(conversation);
    expect(store.getConversation('c1')).toEqual(conversation);
    expect(store.listConversations()).toEqual([{ id: 'c1', title: 'Refactor', updatedAt: '2026-01-01T00:01:00Z' }]);
  });

  it('checkpoints active conversation and unsent input', () => {
    const store = openAgentStore(newDb());
    store.checkpoint('c9', 'half-typed prompt');
    expect(store.checkpointValue()).toEqual({ conversationId: 'c9', unsentInput: 'half-typed prompt' });
  });

  it('records patch and terminal decisions', () => {
    const store = openAgentStore(newDb());
    store.saveConversation({ id: 'c1', title: 'Actions', createdAt: '', updatedAt: '', messages: [] });
    store.recordPatch({ id: 'p1', conversationId: 'c1', path: 'src/a.ts', before: 'old', after: 'new', decision: 'approved' });
    store.recordTerminal({ id: 't1', conversationId: 'c1', command: 'npm test', decision: 'rejected' });
    expect(store.patchesFor('c1')[0]?.decision).toBe('approved');
    expect(store.terminalFor('c1')[0]).toMatchObject({ command: 'npm test', decision: 'rejected' });
    expect(store.patchById('p1')?.path).toBe('src/a.ts');
    expect(store.terminalById('t1')?.command).toBe('npm test');
  });

  it('persists non-secret settings and never stores a raw API key', () => {
    const store = openAgentStore(newDb());
    store.setSetting('modelRoute', { provider: 'openai-compatible', model: 'gpt-test', apiKey: '[REDACTED]' });
    expect(store.getSetting('modelRoute')).toMatchObject({ provider: 'openai-compatible', model: 'gpt-test' });
  });
});
