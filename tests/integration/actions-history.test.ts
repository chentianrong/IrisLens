import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { AgentService } from '../../src/main/agent-service.js';
import { openAgentStore } from '../../src/persistence/store.js';
import type { GatewayManager } from '../../src/gateway/manager.js';
import type { FilePatch, SecretStore, TerminalCommand } from '../../src/types.js';

const secrets: SecretStore = {
  setPassword: async () => undefined,
  getPassword: async () => null,
  deletePassword: async () => true
};

describe('Agent action history', () => {
  it('records approved, rejected, and executed actions in conversation history', async () => {
    const db = new Database(':memory:');
    const store = openAgentStore(db);
    const workDir = await mkdtemp(join(tmpdir(), 'irislens-actions-'));
    const patchPath = join(workDir, 'example.ts');
    await writeFile(patchPath, 'before\n', 'utf8');
    store.saveConversation({ id: 'conversation-1', title: 'Actions', createdAt: '', updatedAt: '', messages: [] });
    const patch: FilePatch = { id: 'patch-1', conversationId: 'conversation-1', path: patchPath, before: 'before\n', after: 'after\n', decision: 'proposed' };
    const command: TerminalCommand = { id: 'terminal-1', conversationId: 'conversation-1', command: 'true', decision: 'proposed' };
    store.recordPatch(patch);
    store.recordTerminal(command);
    const service = new AgentService({ store, secrets, gateway: {} as GatewayManager });

    const approved = await service.approvePatch(patch.id);
    expect(approved.decision).toBe('approved');
    await expect(readFile(patchPath, 'utf8')).resolves.toBe('after\n');

    const rejected = await service.rejectPatch(approved.id);
    expect(rejected.decision).toBe('rejected');

    const executed = await service.approveTerminal(command.id);
    expect(executed.decision).toBe('executed');
    const conversation = store.getConversation('conversation-1');
    expect(conversation?.messages.map((message) => message.content)).toEqual([
      `Approved patch ${patchPath}`,
      `Rejected patch ${patchPath}`,
      'Executed command: true'
    ]);
  });
});
