import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SecretStore } from '../types.js';

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

interface SecretFile {
  [account: string]: { encoding: 'base64'; ciphertext: string };
}

export function safeStorageSecrets(dataDirectory: string, safeStorage: SafeStorageAdapter): SecretStore {
  const file = join(dataDirectory, 'secrets.bin');
  const read = async (): Promise<SecretFile> => {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as SecretFile;
    } catch {
      return {};
    }
  };
  return {
    async setPassword(service, account, password) {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('OS-backed encryption is unavailable');
      const secrets = await read();
      secrets[`${service}:${account}`] = {
        encoding: 'base64',
        ciphertext: safeStorage.encryptString(password).toString('base64')
      };
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(file, JSON.stringify(secrets), 'utf8');
    },
    async getPassword(service, account) {
      const secret = (await read())[`${service}:${account}`];
      if (!secret) return null;
      return safeStorage.decryptString(Buffer.from(secret.ciphertext, 'base64'));
    },
    async deletePassword(service, account) {
      const secrets = await read();
      const deleted = delete secrets[`${service}:${account}`];
      if (deleted) await writeFile(file, JSON.stringify(secrets), 'utf8');
      return deleted;
    }
  };
}
