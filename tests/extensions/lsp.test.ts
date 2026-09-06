import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LspClient, LspSupervisor } from '../../src/extensions/lsp.js';

function frame(message: unknown): Buffer {
  const content = Buffer.from(JSON.stringify(message));
  return Buffer.concat([Buffer.from(`Content-Length: ${content.byteLength}\r\n\r\n`), content]);
}

describe('LSP client', () => {
  it('initializes, synchronizes documents, and receives diagnostics over stdio', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'irislens-lsp-'));
    const serverPath = join(directory, 'server.cjs');
    await writeFile(serverPath, `
      let buffer = Buffer.alloc(0);
      const separator = Buffer.from([13, 10, 13, 10]);
      process.stdin.on('data', chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        while (true) {
          const end = buffer.indexOf(separator);
          if (end < 0) return;
          const length = Number(/Content-Length: (\\d+)/i.exec(buffer.subarray(0, end).toString())?.[1]);
          const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString());
          buffer = buffer.subarray(end + 4 + length);
        if (message.method === 'initialize') {
          process.stdout.write(frame({ jsonrpc: '2.0', id: message.id, result: { capabilities: {} } }));
          process.stdout.write(frame({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri: 'file:///fixture.ts', diagnostics: [{ message: 'fixture', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }] } }));
        }
        if (message.method === 'textDocument/didOpen') opened = true;
        if (message.method === 'shutdown') process.stdout.write(frame({ jsonrpc: '2.0', id: message.id, result: null }));
        }
      });
      function frame(message) { const body = Buffer.from(JSON.stringify(message)); const header = Buffer.from('Content-Length: ' + body.length + String.fromCharCode(13, 10, 13, 10)); return Buffer.concat([header, body]); }
      let opened = false;
    `);
    const client = new LspClient(process.execPath, [serverPath]);
    const diagnostics: unknown[] = [];
    client.onDiagnostics = (item) => diagnostics.push(item);
    await client.start();
    client.didOpen('file:///fixture.ts', 'typescript', 'const x = 1;');
    for (let second = 0; second < 20 && diagnostics.length === 0; second += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(diagnostics[0]).toMatchObject({ uri: 'file:///fixture.ts' });
    await client.shutdown();
  });

  it('marks degraded after server exit and schedules recovery', async () => {
    let attempt = 0;
    const clients: Array<{ start: () => Promise<void>; shutdown: () => Promise<void>; isDegraded: boolean; onExit?: () => void }> = [];
    const supervisor = new LspSupervisor('fixture', [], 1, () => {
      attempt += 1;
      const client: { start: () => Promise<void>; shutdown: () => Promise<void>; isDegraded: boolean; onExit?: () => void } = {
        start: async () => { if (attempt === 1) client.onExit?.(); },
        shutdown: async () => undefined,
        isDegraded: attempt === 1
      };
      clients.push(client);
      return client as never;
    });
    await supervisor.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(attempt).toBeGreaterThan(1);
    expect(supervisor.degraded).toBe(false);
    await supervisor.stop();
  });
});
