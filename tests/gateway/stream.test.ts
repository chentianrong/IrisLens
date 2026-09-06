import { describe, expect, it } from 'vitest';
import { StreamCancelled, streamSse } from '../../src/gateway/stream.js';

function sseResponse(tokens: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const token of tokens) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: token } }] })}\n\n`));
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  return new Response(stream, { status: 200 });
}

describe('gateway stream', () => {
  it('renders tokens incrementally', async () => {
    const tokens: string[] = [];
    await streamSse('http://127.0.0.1:1/chat/completions', {}, (token) => tokens.push(token), new AbortController().signal, async () => sseResponse(['Hello', ' ', 'world']));
    expect(tokens.join('')).toBe('Hello world');
  });

  it('rejects malformed SSE', async () => {
    await expect(streamSse('http://x', {}, () => undefined, new AbortController().signal, async () => new Response('data: not-json\n\n', { status: 200 }))).rejects.toThrow('Malformed gateway SSE payload');
  });

  it('exposes cancellation as a distinct failure', () => {
    expect(new StreamCancelled()).toBeInstanceOf(Error);
  });
});
