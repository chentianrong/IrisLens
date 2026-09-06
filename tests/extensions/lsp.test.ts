import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { LspClient, LspSupervisor } from '../../src/extensions/lsp.js';

function frame(message: unknown): Buffer {
  const content = Buffer.from(JSON.stringify(message));
  return Buffer.concat([Buffer.from(`Content-Length: ${content.byteLength}\r\n\r\n`), content]);
}

describe('LSP client', () => {
  it('initializes, synchronizes documents, and receives diagnostics over stdio', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    let serverBuffer = Buffer.alloc(0);
    stdin.on('data', (chunk: Buffer) => {
      serverBuffer = Buffer.concat([serverBuffer, chunk]);
      while (true) {
        const end = serverBuffer.indexOf('\r\n\r\n');
        if (end < 0) return;
        const length = Number(/Content-Length: (\d+)/i.exec(serverBuffer.subarray(0, end).toString())?.[1]);
        if (serverBuffer.length < end + 4 + length) return;
        const message = JSON.parse(serverBuffer.subarray(end + 4, end + 4 + length).toString());
        serverBuffer = serverBuffer.subarray(end + 4 + length);
        if (message.method === 'initialize') {
          stdout.write(frame({ jsonrpc: '2.0', id: message.id, result: { capabilities: {} } }));
          stdout.write(frame({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: {
            uri: 'file:///fixture.ts',
            diagnostics: [{ message: 'fixture', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }]
          } }));
        }
        if (message.method === 'shutdown') stdout.write(frame({ jsonrpc: '2.0', id: message.id, result: null }));
      }
    });
    const fakeChild = {
      stdin,
      stdout,
      stderr: new PassThrough(),
      on: () => undefined,
      kill: () => undefined
    } as never;
    const client = new LspClient('fixture-server', [], () => fakeChild);
    const diagnostics: unknown[] = [];
    client.onDiagnostics = (item) => diagnostics.push(item);
    await client.start();
    client.didOpen('file:///fixture.ts', 'typescript', 'const x = 1;');
    for (let attempt = 0; attempt < 20 && diagnostics.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
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
