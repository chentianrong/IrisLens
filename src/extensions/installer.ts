import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { extensionId, validateManifest, type ExtensionManifest } from './manifest.js';
import type { ExtensionRegistry, InstalledExtension } from './registry.js';

export type VSIXInstallResult = { manifest: ExtensionManifest; id: string; source: 'local-vsix' | 'open-vsx' };

export class VSIXInstaller {
  constructor(private readonly registry: ExtensionRegistry, private readonly extensionRoot: string) {}

  async install(vsixPath: string, source: 'local-vsix' | 'open-vsx' = 'local-vsix'): Promise<VSIXInstallResult> {
    const zip = await JSZip.loadAsync(await readFile(vsixPath));
    const manifestEntry = zip.file('extension/package.json') ?? zip.file('package.json');
    if (!manifestEntry) throw new Error('VSIX does not contain an extension manifest');
    let manifest: ExtensionManifest;
    try {
      manifest = validateManifest(JSON.parse(await manifestEntry.async('string')));
    } catch (error) {
      throw new Error(`Invalid extension manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
    const id = extensionId(manifest);
    const temporary = await mkdtemp(join(tmpdir(), 'irislens-vsix-'));
    try {
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const relative = entry.name.startsWith('extension/') ? entry.name.slice('extension/'.length) : entry.name;
        if (!relative || relative.startsWith('/') || relative.split('/').includes('..')) continue;
        const target = join(temporary, relative);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, await entry.async('nodebuffer'));
      }
      const destination = join(this.extensionRoot, id);
      await rm(destination, { recursive: true, force: true });
      await rename(temporary, destination);
      const installed: InstalledExtension = {
        manifest,
        source,
        path: destination,
        enabled: true,
        permissions: manifest.irislens?.capabilities ?? [],
        configuration: {}
      };
      await this.registry.add(installed);
      return { manifest, id, source };
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  }
}
