import { useEffect, useState, type ReactElement } from 'react';
import type { InstalledExtension } from '../../extensions/registry.js';

export type ExtensionsViewProps = {
  api: {
    listExtensions(): Promise<InstalledExtension[]>;
    installLocalExtension(path: string): Promise<InstalledExtension>;
    searchExtensions(query: string): Promise<Array<{ id: string; name: string; publisher: string; version: string; description?: string; source: 'open-vsx' }>>;
    installOpenVsxExtension(id: string): Promise<InstalledExtension>;
    setExtensionEnabled(id: string, enabled: boolean): Promise<InstalledExtension>;
  };
};

export function ExtensionsView({ api }: ExtensionsViewProps): ReactElement {
  const [installed, setInstalled] = useState<InstalledExtension[]>([]);
  const [results, setResults] = useState<Array<{ id: string; name: string; publisher: string; version: string; description?: string; source: 'open-vsx' }>>([]);
  const [query, setQuery] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void api.listExtensions().then(setInstalled).catch((error) => setStatus(error.message));
  }, [api]);

  return (
    <section aria-label="Extensions" style={{ display: 'grid', gap: 8 }}>
      <input aria-label="Search Open VSX" value={query} onChange={(event) => setQuery(event.target.value)} />
      <button type="button" onClick={async () => {
        try { setResults(await api.searchExtensions(query)); setStatus(''); } catch (error) { setStatus(error instanceof Error ? error.message : 'Search failed'); }
      }}>Search</button>
      <input aria-label="Local VSIX path" value={localPath} onChange={(event) => setLocalPath(event.target.value)} />
      <button type="button" onClick={async () => {
        try { await api.installLocalExtension(localPath); setInstalled(await api.listExtensions()); setStatus('Installed local VSIX'); } catch (error) { setStatus(error instanceof Error ? error.message : 'Install failed'); }
      }}>Install VSIX</button>
      <div role="status">{status}</div>
      <ul aria-label="Installed extensions">
        {installed.map((extension) => (
          <li key={extension.manifest.name}>
            <strong>{extension.manifest.displayName ?? extension.manifest.name}</strong> {extension.manifest.version} · {extension.source}
            <button type="button" onClick={async () => setInstalled([await api.setExtensionEnabled(`${extension.manifest.publisher.toLowerCase()}.${extension.manifest.name.toLowerCase()}`, !extension.enabled)])}>
              {extension.enabled ? 'Disable' : 'Enable'}
            </button>
          </li>
        ))}
      </ul>
      <ul aria-label="Open VSX results">
        {results.map((result) => (
          <li key={result.id}>
            {result.publisher}.{result.name} {result.version}
            <button type="button" onClick={async () => {
              try { await api.installOpenVsxExtension(result.id); setInstalled(await api.listExtensions()); setStatus(`Installed ${result.id}`); } catch (error) { setStatus(error instanceof Error ? error.message : 'Install failed'); }
            }}>Install</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
