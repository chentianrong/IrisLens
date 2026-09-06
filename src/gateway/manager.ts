import { createServer, type AddressInfo } from 'node:net';
import type { GatewayState } from '../types.js';

export interface ManagedProcess {
  pid: number;
  kill(): void;
  onExit?(callback: (code: number | null) => void): void;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
}

export interface GatewayManagerOptions {
  spawnProcess(options: SpawnOptions): ManagedProcess;
  readinessUrl(port: number): string;
  fetchReadiness(url: string): Promise<boolean>;
  randomDelay(): Promise<void>;
  onUnexpectedExit?(message: string): void;
  host?: string;
}

export interface GatewaySnapshot {
  state: GatewayState;
  port?: number;
  error?: string;
}

function selectPort(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const port = (server.address() as AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

function safeLog(value: string, secrets: string[] = []): string {
  let redacted = value;
  for (const secret of secrets.filter(Boolean)) {
    redacted = redacted.replaceAll(secret, '[REDACTED]');
  }
  return redacted;
}

export class GatewayManager {
  private child?: ManagedProcess;
  private current?: GatewaySnapshot;
  private readonly secrets = new Set<string>();

  constructor(private readonly options: GatewayManagerOptions) {}

  snapshot(): GatewaySnapshot {
    return this.current ?? { state: 'starting' };
  }

  async start(settings: { pythonPath: string; workDir: string; secrets?: string[] }): Promise<number> {
    await this.stop();
    const host = this.options.host ?? '127.0.0.1';
    const port = await selectPort(host);
    for (const secret of settings.secrets ?? []) this.secrets.add(secret);
    this.current = { state: 'starting', port };
    const env: Record<string, string> = { IRISLENS_GATEWAY_HOST: host, IRISLENS_GATEWAY_PORT: String(port) };
    this.child = this.options.spawnProcess({
      command: settings.pythonPath,
      args: ['-m', 'litellm', '--host', host, '--port', String(port)],
      env
    });
    this.child.onExit?.((code) => {
      if (this.child && this.current?.state !== 'error') {
        const error = safeLog(`Gateway exited unexpectedly with code ${code ?? 'unknown'}`, [...this.secrets]);
        this.current = {
          state: 'error',
          port,
          error
        };
        this.options.onUnexpectedExit?.(error);
      }
    });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (!this.child) throw new Error(this.current?.error ?? 'Gateway stopped');
      const ready = await this.options.fetchReadiness(this.options.readinessUrl(port));
      if (ready) {
        this.current = { state: 'ready', port };
        return port;
      }
      await this.options.randomDelay();
    }
    await this.stop();
    throw new Error('Gateway readiness timeout');
  }

  fail(message: string, secrets: string[] = []): void {
    for (const secret of secrets) this.secrets.add(secret);
    this.current = { state: 'error', error: safeLog(message, [...this.secrets]) };
  }

  async restart(settings: Parameters<GatewayManager['start']>[0]): Promise<number> {
    return this.start(settings);
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    child?.kill();
  }

  static redact(value: string, secrets: Array<string | undefined>): string {
    return safeLog(value, secrets.filter((secret): secret is string => Boolean(secret)));
  }
}
