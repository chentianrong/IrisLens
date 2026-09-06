import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export class ExtensionStorage {
  constructor(private readonly root: string) {}

  private path(extensionId: string): string {
    if (!/^[a-z0-9][a-z0-9.-]*$/i.test(extensionId)) throw new Error('Invalid extension storage id');
    return join(this.root, extensionId, 'state.json');
  }

  async read<T>(extensionId: string, key: string): Promise<T | undefined> {
    try {
      const state = JSON.parse(await readFile(this.path(extensionId), 'utf8')) as Record<string, T>;
      return state[key];
    } catch {
      return undefined;
    }
  }

  async write<T>(extensionId: string, key: string, value: T): Promise<void> {
    const target = this.path(extensionId);
    let state: Record<string, unknown> = {};
    try { state = JSON.parse(await readFile(target, 'utf8')) as Record<string, unknown>; } catch { state = {}; }
    state[key] = value;
    await mkdir(join(this.root, extensionId), { recursive: true });
    await writeFile(target, JSON.stringify(state, null, 2), 'utf8');
  }
}
