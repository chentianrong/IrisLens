import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { ExtensionHostManager, type HostChild } from '../../src/extensions/host-manager.js';
import { rpcRequest, rpcResult } from '../../src/extensions/jsonrpc.js';

class FakeChild extends EventEmitter {
  send = vi.fn((message: unknown) => {
    const request = message as { id: number; method: string };
    if (request.method === 'ping') this.emit('message', rpcResult(request.id, 'pong'));
    if (request.method === 'boom') this.emit('message', rpcResult(request.id, undefined, { code: 1, message: 'failed' }));
  });
  kill = vi.fn();
  pid = 1234;
}

describe('ExtensionHostManager', () => {
  it('starts, requests, and stops the host', async () => {
    const child = new FakeChild() as unknown as HostChild & EventEmitter;
    const manager = new ExtensionHostManager('/fixture/host.js', () => {
      queueMicrotask(() => child.emit('message', { jsonrpc: '2.0', method: 'host.ready' }));
      return child;
    }, 100);
    await manager.start();
    await expect(manager.request('ping')).resolves.toBe('pong');
    expect(manager.isReady).toBe(true);
    await manager.stop();
    expect(child.kill).toHaveBeenCalled();
  });

  it('rejects startup timeout and reports repeated activation failures', async () => {
    const child = new FakeChild() as unknown as HostChild & EventEmitter;
    const manager = new ExtensionHostManager('/fixture/host.js', () => child, 10);
    await expect(manager.start()).rejects.toThrow('timed out');
    const manifest = { name: 'bad', publisher: 'x', version: '1.0.0', engines: { vscode: '*' } };
    await expect(manager.activate(manifest)).rejects.toThrow('not ready');
    await expect(manager.activate(manifest)).rejects.toThrow('not ready');
    expect(manager.shouldDisable('x.bad')).toBe(true);
  });
});
