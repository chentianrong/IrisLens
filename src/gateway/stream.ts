export class StreamCancelled extends Error {
  constructor() {
    super('Gateway stream cancelled');
    this.name = 'StreamCancelled';
  }
}

export async function streamSse(
  url: string,
  body: unknown,
  onToken: (token: string) => void,
  signal: AbortSignal,
  fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch
): Promise<void> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok || !response.body) throw new Error(`Gateway stream failed with HTTP ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      for (const line of value.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const token = event.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch {
          throw new Error('Malformed gateway SSE payload');
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
