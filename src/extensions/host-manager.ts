import { fork, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rpcError, rpcRequest, rpcResult, type JsonRpcMessage } from './jsonrpc.js';
import type { ExtensionManifest } from './manifest.js';

export type HostChild = Pick<ChildProcess, 'send' | 'kill' | 'pid'> & {
  on(event: 'message', listener: (message: JsonRpcMessage) => void): unknown;
  on(event: 'exit', listener: (code: number | null) => void): unknown;
};
export type SpawnHost = (modulePath: string) => HostChild;

export class ExtensionHostManager {
  private child?: HostChild;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private ready = false;
  private restarting = false;
  private restartCount = 0;
  private readonly failures = new Map<string, number>();
  private exitHandler?: (code: number | null) => void;
  onExit?: (code: number | null) => void;

  constructor(
    private readonly hostPath = join(dirname(fileURLToPath(import.meta.url)), 'host.js'),
    private readonly spawn: SpawnHost = (modulePath) => fork(modulePath, [], { stdio: 'ignore' }) as unknown as HostChild,
    private readonly startupTimeoutMs = 5000
  ) {}

  get pid(): number | undefined { return this.child?.pid; }
  get isReady(): boolean { return this.ready; }
  get restarts(): number { return this.restartCount; }

  async start(): Promise<void> {
    if (this.ready) return;
    this.child = this.spawn(this.hostPath);
    this.child.on('message', (message) => this.handleMessage(message));
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Extension Host startup timed out')), this.startupTimeoutMs);
      this.child!.on('message', (message) => {
        if ('method' in message && message.method === 'host.ready') {
          clearTimeout(timeout);
          this.ready = true;
          resolve();
        }
      });
      this.child!.on('exit', (code) => {
        clearTimeout(timeout);
        this.ready = false;
        if (!this.ready) reject(new Error(`Extension Host exited during startup (${code})`));
        else this.onExit?.(code);
      });
    });
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (!('id' in message)) {
      if ('method' in message && message.method === 'host.ready') this.ready = true;
      return;
    }
    const pending = this.pending.get(message.id as number);
    if (!pending) return;
    this.pending.delete(message.id as number);
    if ('method' in message) return;
    if ('error' in message && message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.child || !this.ready) return Promise.reject(new Error('Extension Host is not ready'));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.child!.send(rpcRequest(id, method, params), (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  notify(method: string, params?: unknown): void {
    this.child?.send({ jsonrpc: '2.0' as const, method, params });
  }

  async register(manifest: ExtensionManifest): Promise<void> {
    await this.request('extension.register', manifest);
  }

  async activate(manifest: ExtensionManifest): Promise<unknown> {
    try {
      return await this.request('extension.activate', manifest);
    } catch (error) {
      const id = `${manifest.publisher.toLowerCase()}.${manifest.name.toLowerCase()}`;
      this.failures.set(id, (this.failures.get(id) ?? 0) + 1);
      throw error;
    }
  }

  shouldDisable(id: string): boolean {
    return (this.failures.get(id) ?? 0) >= 2;
  }

  async restart(): Promise<void> {
    if (this.restarting) return;
    this.restarting = true;
    try {
      this.child?.kill();
      this.ready = false;
      this.restartCount += 1;
      await this.start();
    } finally { this.restarting = false; }
  }

  async stop(): Promise<void> {
    if (!this.child) return;
    const child = this.child;
    this.child = undefined;
    this.ready = false;
    child.kill();
    await delay(10);
  }

  unsupportedError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('Unsupported extension API');
  }
}
