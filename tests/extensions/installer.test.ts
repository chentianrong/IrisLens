import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { VSIXInstaller } from '../../src/extensions/installer.js';
import { ExtensionRegistry } from '../../src/extensions/registry.js';

async function createVsix(manifest: Record<string, unknown>): Promise<string> {
  const zip = new JSZip();
  zip.file('extension/package.json', JSON.stringify(manifest));
  zip.file('extension/main.js', 'exports.activate = () => "ok";');
  const path = join(await mkdtemp(join(tmpdir(), 'vsix-source-')), 'fixture.vsix');
  await writeFile(path, await zip.generateAsync({ type: 'nodebuffer' }));
  return path;
}

describe('VSIXInstaller', () => {
  let root: string;
  let registry: ExtensionRegistry;
  let installer: VSIXInstaller;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'irislens-extensions-'));
    registry = new ExtensionRegistry(join(root, 'registry.json'), root);
    installer = new VSIXInstaller(registry, root);
  });

  it('installs a valid VSIX and records source', async () => {
    const path = await createVsix({ name: 'fixture', publisher: 'IrisLens', version: '1.0.0', engines: { vscode: '^1.0.0' } });
    const result = await installer.install(path, 'local-vsix');
    expect(result.id).toBe('irislens.fixture');
    expect(await registry.list()).toHaveLength(1);
  });

  it('rejects malformed packages and duplicates', async () => {
    await expect(installer.install(await createVsix({ publisher: 'IrisLens' }))).rejects.toThrow('name');
    const valid = await createVsix({ name: 'fixture', publisher: 'IrisLens', version: '1.0.0', engines: { vscode: '^1.0.0' } });
    await installer.install(valid);
    await expect(installer.install(valid)).rejects.toThrow('already installed');
  });
});
