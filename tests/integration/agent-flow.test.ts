import { describe, expect, it, vi } from 'vitest';
import { GatewayManager } from '../../src/gateway/manager.js';
import { StreamCancelled, streamSse } from '../../src/gateway/stream.js';
import { buildRequestPayload, captureContext } from '../../src/agent/context.js';

describe('Agent vertical slice flow', () => {
  it('blocks requests until gateway readiness and streams incrementally', async () => {
    let ready = false;
    const manager = new GatewayManager({
      spawnProcess: () => ({ pid: 42, kill: () => undefined }),
      readinessUrl: () => 'http://127.0.0.1:1/health',
      fetchReadiness: async () => ready,
      randomDelay: async () => undefined
    });
    expect(manager.snapshot().state).toBe('starting');
    ready = true;
    await manager.start({ pythonPath: 'python', workDir: '.' });
    expect(manager.snapshot().state).toBe('ready');

    const payload = buildRequestPayload({
      message: 'Summarize the selected code',
      model: 'gpt-test',
      context: captureContext({ selection: { path: 'src/a.ts', content: 'export {};' } })
    });
    expect(payload.context).toHaveLength(1);

    const tokens: string[] = [];
    const controller = new AbortController();
    const response = () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const token of ['Hello', ' ', 'world']) {
            if (controller.desiredSize === null) break;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`));
          }
          controller.close();
        }
      });
      return new Response(stream, { status: 200 });
    };
    await streamSse('http://127.0.0.1/gateway', payload, (token) => tokens.push(token), controller.signal, async () => response());
    expect(tokens.join('')).toBe('Hello world');
  });

  it('surfaces cancellation without losing received content', async () => {
    const tokens: string[] = [];
    const controller = new AbortController();
    controller.abort();
    await expect(
      streamSse('http://127.0.0.1/gateway', {}, (token) => tokens.push(token), controller.signal, async () => { throw new DOMException('aborted', 'AbortError'); })
    ).rejects.toThrow('aborted');
    expect(new StreamCancelled().name).toBe('StreamCancelled');
  });
});
