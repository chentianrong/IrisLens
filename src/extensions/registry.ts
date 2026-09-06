import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extensionId, type ExtensionManifest } from './manifest.js';

export type ExtensionSource = 'local-vsix' | 'open-vsx';
export type InstalledExtension = {
  manifest: ExtensionManifest;
  source: ExtensionSource;
  path: string;
  enabled: boolean;
  permissions: string[];
  configuration: Record<string, unknown>;
};

export type ExtensionRegistryFile = { version: 1; extensions: InstalledExtension[] };

export class ExtensionRegistry {
  constructor(private readonly filePath: string, private readonly extensionRoot: string) {}

  private async read(): Promise<ExtensionRegistryFile> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as ExtensionRegistryFile;
      return { version: 1, extensions: Array.isArray(parsed.extensions) ? parsed.extensions : [] };
    } catch {
      return { version: 1, extensions: [] };
    }
  }

  private async write(file: ExtensionRegistryFile): Promise<void> {
    await mkdir(this.extensionRoot, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(file, null, 2), 'utf8');
  }

  async list(): Promise<InstalledExtension[]> {
    return (await this.read()).extensions;
  }

  async get(id: string): Promise<InstalledExtension | undefined> {
    return (await this.list()).find((item) => extensionId(item.manifest) === id);
  }

  async add(extension: InstalledExtension): Promise<void> {
    const file = await this.read();
    const id = extensionId(extension.manifest);
    if (file.extensions.some((item) => extensionId(item.manifest) === id)) throw new Error(`Extension ${id} is already installed`);
    await this.write({ version: 1, extensions: [...file.extensions, extension] });
  }

  async update(id: string, patch: Partial<InstalledExtension>): Promise<InstalledExtension> {
    const file = await this.read();
    const index = file.extensions.findIndex((item) => extensionId(item.manifest) === id);
    if (index < 0) throw new Error(`Extension ${id} is not installed`);
    const next = { ...file.extensions[index]!, ...patch };
    file.extensions[index] = next;
    await this.write(file);
    return next;
  }

  async remove(id: string): Promise<void> {
    const file = await this.read();
    const extension = file.extensions.find((item) => extensionId(item.manifest) === id);
    if (!extension) throw new Error(`Extension ${id} is not installed`);
    await rm(join(this.extensionRoot, id), { recursive: true, force: true });
    await this.write({ version: 1, extensions: file.extensions.filter((item) => extensionId(item.manifest) !== id) });
  }
}
