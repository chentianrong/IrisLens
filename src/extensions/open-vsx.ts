import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { VSIXInstaller } from './installer.js';

export type OpenVsxSearchResult = {
  id: string; name: string; publisher: string; version: string; description?: string; downloadUrl: string; source: 'open-vsx';
};

export type FetchLike = typeof fetch;

export class OpenVsxClient {
  constructor(private readonly endpoint = 'https://open-vsx.org/api', private readonly fetchImpl: FetchLike = fetch) {}

  private async request<T>(url: string): Promise<T> {
    const response = await this.fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Open VSX request failed (${response.status})`);
    return await response.json() as T;
  }

  async search(query: string): Promise<OpenVsxSearchResult[]> {
    const response = await this.request<{
      extensions?: Array<{ url?: string; name: string; namespace: string; version?: string; timestamp?: string; files?: { download?: string }; description?: string }>
    }>(`${this.endpoint}/-/search?query=${encodeURIComponent(query)}&size=20`);
    return (response.extensions ?? []).map((item) => ({
      id: `${item.namespace.toLowerCase()}.${item.name.toLowerCase()}`,
      name: item.name,
      publisher: item.namespace,
      version: item.version ?? 'latest',
      description: item.description,
      downloadUrl: item.files?.download ?? `${item.url ?? `${this.endpoint}/${item.namespace}/${item.name}`}/file/${item.version ?? 'latest'}/${item.name}-${item.version ?? 'latest'}.vsix`,
      source: 'open-vsx'
    }));
  }

  async metadata(id: string): Promise<OpenVsxSearchResult | undefined> {
    const [publisher, name] = id.split('.');
    if (!publisher || !name) return undefined;
    const item = await this.request<{ name: string; namespace: string; version: string; description?: string; files?: { download?: string } }>(`${this.endpoint}/${publisher}/${name}`);
    return { id, name: item.name, publisher: item.namespace, version: item.version, description: item.description, downloadUrl: item.files?.download ?? '', source: 'open-vsx' };
  }

  async install(id: string, installer: VSIXInstaller, version?: string): Promise<void> {
    const metadata = await this.metadata(id);
    if (!metadata?.downloadUrl) throw new Error(`Open VSX extension is unavailable: ${id}`);
    const response = await this.fetchImpl(metadata.downloadUrl);
    if (!response.ok || !response.body) throw new Error(`Open VSX download failed (${response.status})`);
    const directory = await mkdtemp(join(tmpdir(), 'irislens-openvsx-'));
    const file = join(directory, `${id}-${version ?? metadata.version}.vsix`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    await installer.install(file, 'open-vsx');
  }
}
