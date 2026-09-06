import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

export type LspSpawn = (command: string, args: string[]) => ChildProcessWithoutNullStreams;
export type LspDiagnostic = { uri: string; diagnostics: Array<{ message: string; severity?: number; range: { start: { line: number; character: number }; end: { line: number; character: number } } }> };

export class LspClient {
  private child?: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private ready = false;
  private degraded = false;
  onDiagnostics?: (diagnostics: LspDiagnostic) => void;
  onExit?: (code: number | null) => void;

  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly spawnFactory: LspSpawn = spawn
  ) {}

  get isReady(): boolean { return this.ready; }
  get isDegraded(): boolean { return this.degraded; }

  async start(): Promise<void> {
    if (this.ready) return;
    this.child = this.spawnFactory(this.command, this.args);
    this.child.stdout.on('data', (chunk: Buffer) => this.receive(chunk));
    this.child.stderr.on('data', (chunk: Buffer) => {
      if (process.env.IRISLENS_LSP_DEBUG === '1') console.error('[lsp]', chunk.toString());
    });
    this.child.on('exit', (code) => {
      this.ready = false;
      this.degraded = true;
      this.onExit?.(code);
    });
    const capabilities = await this.request({ method: 'initialize', params: { processId: process.pid, capabilities: {} } });
    this.notify('initialized', {});
    this.ready = true;
    this.degraded = false;
    return capabilities as void;
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const separator = this.buffer.indexOf('\r\n\r\n');
      if (separator < 0) return;
      const headers = this.buffer.subarray(0, separator).toString('utf8');
      const length = Number(/Content-Length: (\d+)/i.exec(headers)?.[1]);
      if (!Number.isFinite(length)) return;
      const total = separator + 4 + length;
      if (this.buffer.length < total) return;
      const message = JSON.parse(this.buffer.subarray(separator + 4, total).toString('utf8')) as {
        id?: number; result?: unknown; error?: { message: string }; method?: string; params?: { uri: string; diagnostics: unknown[] };
      };
      this.buffer = this.buffer.subarray(total);
      if (message.method === 'textDocument/publishDiagnostics') this.onDiagnostics?.(message.params as LspDiagnostic);
      else if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id);
        if (!pending) continue;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      }
    }
  }

  request<T>(message: { method: string; params?: unknown }): Promise<T> {
    if (!this.child) return Promise.reject(new Error('LSP server is not running'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.send({ jsonrpc: '2.0', id, ...message });
    });
  }

  notify(method: string, params?: unknown): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  didOpen(uri: string, languageId: string, text: string, version = 1): void {
    this.notify('textDocument/didOpen', { textDocument: { uri, languageId, text, version } });
  }

  didChange(uri: string, text: string, version = Date.now()): void {
    this.notify('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [{ text }] });
  }

  completion(uri: string, line: number, character: number) { return this.request({ method: 'textDocument/completion', params: { textDocument: { uri }, position: { line, character } } }); }
  hover(uri: string, line: number, character: number) { return this.request({ method: 'textDocument/hover', params: { textDocument: { uri }, position: { line, character } } }); }
  definition(uri: string, line: number, character: number) { return this.request({ method: 'textDocument/definition', params: { textDocument: { uri }, position: { line, character } } }); }
  formatting(uri: string) { return this.request({ method: 'textDocument/formatting', params: { textDocument: { uri }, options: { tabSize: 2, insertSpaces: true } } }); }

  private send(message: unknown): void {
    if (!this.child) throw new Error('LSP server is not running');
    const content = Buffer.from(JSON.stringify(message), 'utf8');
    this.child.stdin.write(Buffer.concat([
      Buffer.from(`Content-Length: ${content.byteLength}\r\n\r\n`),
      content
    ]));
  }

  async shutdown(): Promise<void> {
    if (!this.child) return;
    try { await this.request({ method: 'shutdown' }); } catch { /* server may already be gone */ }
    this.notify('exit');
    this.child.kill();
    this.child = undefined;
    this.ready = false;
  }
}

export class LspSupervisor {
  private client?: LspClient;
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly command: string,
    private readonly args: string[] = [],
    private readonly retryDelayMs = 1000,
    private readonly createClient: (command: string, args: string[]) => LspClient = (command, args) => new LspClient(command, args)
  ) {}

  get current(): LspClient | undefined { return this.client; }
  get degraded(): boolean { return this.client?.isDegraded ?? true; }

  async start(): Promise<LspClient> {
    const client = this.createClient(this.command, this.args);
    client.onExit = () => {
      this.client = client;
      this.scheduleRetry();
    };
    await client.start();
    this.client = client;
    return client;
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.start().catch(() => this.scheduleRetry());
    }, this.retryDelayMs);
    this.retryTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    await this.client?.shutdown();
    this.client = undefined;
  }
}
