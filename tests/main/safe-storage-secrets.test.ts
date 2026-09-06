import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { safeStorageSecrets } from '../../src/main/safe-storage-secrets.js';

describe('OS-backed secret storage', () => {
  it('does not persist plaintext API keys', async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), 'irislens-secrets-'));
    const store = safeStorageSecrets(dataDirectory, {
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(`encrypted:${value}`),
      decryptString: (value) => value.toString().replace('encrypted:', '')
    });
    await store.setPassword('IrisLens', 'model-route:default', 'sk-secret');
    const file = await readFile(join(dataDirectory, 'secrets.bin'), 'utf8');
    expect(file).not.toContain('sk-secret');
    expect(await store.getPassword('IrisLens', 'model-route:default')).toBe('sk-secret');
  });

  it('refuses to store secrets without OS-backed encryption', async () => {
    const store = safeStorageSecrets('/tmp/irislens-disabled', { isEncryptionAvailable: () => false, encryptString: () => Buffer.alloc(0), decryptString: () => '' });
    await expect(store.setPassword('IrisLens', 'account', 'secret')).rejects.toThrow('OS-backed encryption is unavailable');
  });
});
