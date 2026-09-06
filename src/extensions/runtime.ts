import { extensionId, type ExtensionManifest } from './manifest.js';
import { ExtensionPermissionManager } from './permissions.js';

export type ExtensionEvent = { type: 'workspace' | 'editor' | 'configuration'; name: string; payload?: unknown };
export type ExtensionDiagnostic = { extensionId: string; level: 'info' | 'warning' | 'error'; message: string };

export class UnsupportedApiError extends Error {
  readonly api: string;
  constructor(api: string) {
    super(`Unsupported extension API: ${api}`);
    this.name = 'UnsupportedApiError';
    this.api = api;
  }
}

type Listener<T> = (value: T) => void;

export class ExtensionRuntime {
  private readonly extensions = new Map<string, ExtensionManifest>();
  private readonly active = new Set<string>();
  private readonly commands = new Map<string, (...args: unknown[]) => unknown>();
  private readonly configuration = new Map<string, Record<string, unknown>>();
  private readonly diagnostics: ExtensionDiagnostic[] = [];
  private readonly events: ExtensionEvent[] = [];
  private readonly listeners = new Map<string, Set<Listener<unknown>>>();
  private readonly permissions = new ExtensionPermissionManager();

  register(manifest: ExtensionManifest): void {
    this.extensions.set(extensionId(manifest), manifest);
  }

  list(): ExtensionManifest[] {
    return [...this.extensions.values()];
  }

  contributions(id: string): ExtensionManifest['contributes'] {
    return this.extensions.get(id)?.contributes;
  }

  diagnosticsFor(id: string): ExtensionDiagnostic[] {
    return this.diagnostics.filter((item) => item.extensionId === id);
  }

  async activate(id: string): Promise<void> {
    const manifest = this.extensions.get(id);
    if (!manifest) throw new Error(`Extension ${id} is not registered`);
    if (this.active.has(id)) return;
    this.active.add(id);
    for (const command of manifest.contributes?.commands ?? []) {
      this.commands.set(command.command, (...args: unknown[]) => this.invokeExtensionCommand(id, command.command, args));
    }
    for (const [key, value] of Object.entries(manifest.contributes?.configuration?.properties ?? {})) {
      if (!this.configuration.has(id)) this.configuration.set(id, {});
      this.configuration.get(id)![key] = (value as { default?: unknown }).default;
    }
  }

  async deactivate(id: string): Promise<void> {
    this.active.delete(id);
    for (const [command, owner] of this.commandOwners()) if (owner === id) this.commands.delete(command);
  }

  private commandOwners(): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    for (const manifest of this.extensions.values()) {
      for (const command of manifest.contributes?.commands ?? []) result.push([command.command, extensionId(manifest)]);
    }
    return result;
  }

  registerCommand(command: string, handler: (...args: unknown[]) => unknown): void {
    this.commands.set(command, handler);
  }

  async executeCommand(command: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.commands.get(command);
    if (!handler) throw new Error(`Command not found: ${command}`);
    return handler(...args);
  }

  getConfiguration(id: string): Record<string, unknown> {
    return this.configuration.get(id) ?? {};
  }

  updateConfiguration(id: string, patch: Record<string, unknown>): void {
    this.configuration.set(id, { ...this.getConfiguration(id), ...patch });
    this.emit({ type: 'configuration', name: id, payload: this.getConfiguration(id) });
  }

  emit(event: ExtensionEvent): void {
    this.events.push(event);
    for (const listener of this.listeners.get(`${event.type}:${event.name}`) ?? []) listener(event.payload);
    for (const listener of this.listeners.get(event.type) ?? []) listener(event.payload);
  }

  subscribe(type: ExtensionEvent['type'], name: string | undefined, listener: Listener<unknown>): () => void {
    const key = name ? `${type}:${name}` : type;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(listener);
    return () => this.listeners.get(key)?.delete(listener);
  }

  callApi(id: string, api: string, ...args: unknown[]): unknown {
    if (api === 'command.execute') return this.executeCommand(args[0] as string, ...args.slice(1));
    if (api === 'configuration.get') return this.getConfiguration(id);
    if (api === 'event.subscribe') {
      const [type, name] = args as [ExtensionEvent['type'], string | undefined];
      return this.subscribe(type, name, () => undefined);
    }
    this.diagnostics.push({ extensionId: id, level: 'warning', message: `API ${api} is unsupported in Phase A` });
    throw new UnsupportedApiError(api);
  }

  private invokeExtensionCommand(id: string, command: string, args: unknown[]): unknown {
    this.permissions.assert(id, 'commands.execute');
    this.emit({ type: 'editor', name: 'command', payload: { id, command, args } });
    return undefined;
  }
}
