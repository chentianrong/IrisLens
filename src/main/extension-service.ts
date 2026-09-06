import { join } from 'node:path';
import { ExtensionHostManager } from '../extensions/host-manager.js';
import { VSIXInstaller } from '../extensions/installer.js';
import { OpenVsxClient } from '../extensions/open-vsx.js';
import { ExtensionRegistry, type InstalledExtension } from '../extensions/registry.js';
import { ExtensionStorage } from '../extensions/storage.js';

export type ExtensionServiceOptions = {
  dataDirectory: string;
  host?: ExtensionHostManager;
  openVsx?: OpenVsxClient;
};

export class ExtensionService {
  readonly registry: ExtensionRegistry;
  readonly installer: VSIXInstaller;
  readonly openVsx: OpenVsxClient;
  readonly host: ExtensionHostManager;
  readonly storage: ExtensionStorage;
  private readonly diagnostics: Array<{ extensionId?: string; level: 'info' | 'warning' | 'error'; message: string }> = [];

  constructor(options: ExtensionServiceOptions) {
    const extensionRoot = join(options.dataDirectory, 'extensions');
    this.registry = new ExtensionRegistry(join(extensionRoot, 'registry.json'), extensionRoot);
    this.installer = new VSIXInstaller(this.registry, extensionRoot);
    this.openVsx = options.openVsx ?? new OpenVsxClient();
    this.host = options.host ?? new ExtensionHostManager(join(import.meta.dirname ?? process.cwd(), '../extensions/host.js'));
    this.storage = new ExtensionStorage(join(options.dataDirectory, 'extension-storage'));
    this.host.onExit = (code) => {
      this.recordDiagnostic({ level: 'error', message: `Extension Host exited (${code}); restarting` });
      void this.host.restart().catch((error) => this.recordDiagnostic({ level: 'error', message: error.message }));
    };
  }

  list(): Promise<InstalledExtension[]> {
    return this.registry.list();
  }

  async installLocal(path: string): Promise<InstalledExtension> {
    const { id } = await this.installer.install(path, 'local-vsix');
    return (await this.registry.get(id))!;
  }

  private recordDiagnostic(entry: { extensionId?: string; level: 'info' | 'warning' | 'error'; message: string }): void {
    this.diagnostics.push(entry);
  }

  failureDiagnostics(): Array<{ extensionId?: string; level: 'info' | 'warning' | 'error'; message: string }> {
    return [...this.diagnostics];
  }

  async setPermission(id: string, capability: string, granted: boolean): Promise<InstalledExtension> {
    const extension = await this.registry.get(id);
    if (!extension) throw new Error(`Extension ${id} is not installed`);
    const permissions = granted
      ? [...new Set([...extension.permissions, capability])]
      : extension.permissions.filter((item) => item !== capability);
    return this.registry.update(id, { permissions });
  }

  readStorage<T>(id: string, key: string): Promise<T | undefined> {
    return this.storage.read<T>(id, key);
  }

  writeStorage<T>(id: string, key: string, value: T): Promise<void> {
    return this.storage.write(id, key, value);
  }

  search(query: string): Promise<Awaited<ReturnType<OpenVsxClient['search']>>> {
    return this.openVsx.search(query);
  }

  async installOpenVsx(id: string): Promise<InstalledExtension> {
    await this.openVsx.install(id, this.installer);
    return (await this.registry.get(id))!;
  }

  async setEnabled(id: string, enabled: boolean): Promise<InstalledExtension> {
    const extension = await this.registry.update(id, { enabled });
    if (enabled) {
      try {
        await this.host.register(extension.manifest);
        await this.host.activate({ ...extension.manifest, main: extension.manifest.main ? join(extension.path, extension.manifest.main) : undefined });
      } catch (error) {
        if (this.host.shouldDisable(id)) {
          await this.registry.update(id, { enabled: false });
          this.recordDiagnostic({ extensionId: id, level: 'error', message: `Disabled after repeated failure: ${error instanceof Error ? error.message : String(error)}` });
        }
        throw error;
      }
    } else {
      this.host.notify('extension.deactivate', id);
    }
    return extension;
  }

  async configure(id: string, values: Record<string, unknown>): Promise<InstalledExtension> {
    const extension = await this.registry.get(id);
    if (!extension) throw new Error(`Extension ${id} is not installed`);
    const configuration = { ...extension.configuration, ...values };
    const updated = await this.registry.update(id, { configuration });
    this.host.notify('configuration.update', { id, values: configuration });
    return updated;
  }

  async start(): Promise<void> {
    await this.host.start();
    for (const extension of await this.registry.list()) {
      if (!extension.enabled) continue;
      try {
        await this.host.register(extension.manifest);
        await this.host.activate({ ...extension.manifest, main: extension.manifest.main ? join(extension.path, extension.manifest.main) : undefined });
      } catch (error) {
        if (this.host.shouldDisable(`${extension.manifest.publisher.toLowerCase()}.${extension.manifest.name.toLowerCase()}`)) {
          await this.registry.update(`${extension.manifest.publisher.toLowerCase()}.${extension.manifest.name.toLowerCase()}`, { enabled: false });
        }
        this.recordDiagnostic({ extensionId: `${extension.manifest.publisher.toLowerCase()}.${extension.manifest.name.toLowerCase()}`, level: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  async stop(): Promise<void> {
    await this.host.stop();
  }
}
