import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceService } from '../../src/main/workspace-service.js';

describe('WorkspaceService', () => {
  let root: string;
  let workspace: WorkspaceService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'irislens-workspace-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# IrisLens\n');
    await writeFile(join(root, 'src/app.ts'), 'export {};\n');
    workspace = new WorkspaceService(root);
  });

  it('lists workspace entries safely', async () => {
    const entries = await workspace.list();
    expect(entries.map((entry) => entry.path)).toEqual(['src', 'README.md']);
    expect(entries[0]?.directory).toBe(true);
  });

  it('reads and atomically writes files', async () => {
    await workspace.write('src/new.ts', 'export const value = 1;\n');
    expect(await workspace.read('src/new.ts')).toContain('value');
    expect(await readFile(join(root, 'src/new.ts'), 'utf8')).toContain('value');
  });

  it('rejects traversal', async () => {
    await expect(workspace.read('../outside')).rejects.toThrow('escapes');
  });
});
