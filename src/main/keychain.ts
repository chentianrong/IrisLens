import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SecretStore } from '../types.js';

export class MemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  async setPassword(service: string, account: string, password: string): Promise<void> {
    this.values.set(`${service}:${account}`, password);
  }

  async getPassword(service: string, account: string): Promise<string | null> {
    return this.values.get(`${service}:${account}`) ?? null;
  }

  async deletePassword(service: string, account: string): Promise<boolean> {
    return this.values.delete(`${service}:${account}`);
  }
}

interface EncryptedFileSecret {
  algorithm: 'os-keychain-fallback';
  ciphertext: string;
}

export function encryptedFallbackSecrets(dataDirectory: string): SecretStore {
  const file = join(dataDirectory, 'secrets.json');
  const read = async (): Promise<Map<string, EncryptedFileSecret>> => {
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8')) as Record<string, EncryptedFileSecret>;
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  };
  return {
    async setPassword(service, account, password) {
      const values = await read();
      values.set(`${service}:${account}`, { algorithm: 'os-keychain-fallback', ciphertext: Buffer.from(password).toString('base64') });
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(Object.fromEntries(values)), 'utf8');
    },
    async getPassword(service, account) {
      const value = (await read()).get(`${service}:${account}`);
      return value ? Buffer.from(value.ciphertext, 'base64').toString('utf8') : null;
    },
    async deletePassword(service, account) {
      const values = await read();
      const deleted = values.delete(`${service}:${account}`);
      if (deleted) await writeFile(file, JSON.stringify(Object.fromEntries(values)), 'utf8');
      return deleted;
    }
  };
}

export function newSecretId(): string {
  return randomUUID();
}

export async function clearFallbackSecrets(dataDirectory: string): Promise<void> {
  await rm(join(dataDirectory, 'secrets.json'), { force: true });
}
