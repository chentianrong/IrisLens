import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { openAgentStore } from '../../src/persistence/store.js';

describe('simulated upgrade retention', () => {
  it('retains settings, checkpoint, and history after reopening the database', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'irislens-upgrade-')), 'agent.sqlite');
    const beforeDb = new Database(file);
    const before = openAgentStore(beforeDb);
    before.setSetting('modelRoute', { provider: 'openai-compatible', model: 'gpt-test' });
    before.checkpoint('conversation-1', 'unsent input');
    before.saveConversation({
      id: 'conversation-1',
      title: 'Upgrade',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
      messages: [{ id: 'message-1', conversationId: 'conversation-1', role: 'user', content: 'Keep me', state: 'complete', createdAt: '2026-01-01T00:00:00.000Z' }]
    });
    beforeDb.close();

    const afterDb = new Database(file);
    const after = openAgentStore(afterDb);
    expect(after.getSetting('modelRoute')).toEqual({ provider: 'openai-compatible', model: 'gpt-test' });
    expect(after.checkpointValue()).toEqual({ conversationId: 'conversation-1', unsentInput: 'unsent input' });
    expect(after.getConversation('conversation-1')?.messages).toHaveLength(1);
    afterDb.close();
  });
});
