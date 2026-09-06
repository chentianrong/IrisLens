import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExtensionStorage } from '../../src/extensions/storage.js';

describe('ExtensionStorage', () => {
  it('isolates state by extension id and persists values', async () => {
    const storage = new ExtensionStorage(await mkdtemp(join(tmpdir(), 'extension-storage-')));
    await storage.write('a.b', 'value', { count: 1 });
    await storage.write('c.d', 'value', { count: 2 });
    await expect(storage.read<{ count: number }>('a.b', 'value')).resolves.toEqual({ count: 1 });
    await expect(storage.read<{ count: number }>('c.d', 'value')).resolves.toEqual({ count: 2 });
    await expect(storage.read('a.b', 'missing')).resolves.toBeUndefined();
    await expect(storage.write('../bad', 'key', 1)).rejects.toThrow('Invalid extension storage id');
  });
});
