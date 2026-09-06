import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { languageForPath, type WorkspaceApi, type WorkspaceEntry } from '../ui/editor/workspace.js';

export type { WorkspaceApi, WorkspaceEntry };

export class WorkspaceService {
  constructor(private readonly root: string) {}

  private safePath(relativePath: string): string {
    const target = resolve(this.root, relativePath.replace(/^[/\\]+/, ''));
    if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) {
      throw new Error('Workspace path escapes the workspace root');
    }
    return target;
  }

  async list(relativePath = ''): Promise<WorkspaceEntry[]> {
    const directory = this.safePath(relativePath);
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
      .map((entry) => ({ path: join(relativePath, entry.name), name: entry.name, directory: entry.isDirectory() }))
      .sort((left, right) => Number(right.directory) - Number(left.directory) || left.name.localeCompare(right.name));
  }

  async read(relativePath: string): Promise<string> {
    return readFile(this.safePath(relativePath), 'utf8');
  }

  async write(relativePath: string, content: string): Promise<void> {
    const target = this.safePath(relativePath);
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.${Date.now()}.tmp`;
    await writeFile(temporary, content, 'utf8');
    await rename(temporary, target);
  }
}

export { languageForPath };
