import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { languageForPath, type WorkspaceApi, type WorkspaceEntry } from './workspace.js';
import { MonacoEditor, type MonacoDiagnostic } from './MonacoEditor.js';
import type { ThemeMode } from '../theme/tokens.js';

export type WorkspaceEditorProps = { api: WorkspaceApi; themeMode: ThemeMode };

type Tab = { path: string; value: string; dirty: boolean; diagnostics: MonacoDiagnostic[] };

export function WorkspaceEditor({ api, themeMode }: WorkspaceEditorProps): ReactElement {
  const [entries, setEntries] = useState<WorkspaceEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string>();
  const [notice, setNotice] = useState('No file open');
  const active = tabs.find((tab) => tab.path === activePath);

  useEffect(() => {
    let cancelled = false;
    void api.listWorkspaceFiles('').then(async (items) => {
      if (cancelled) return;
      setEntries(items);
      const first = items.find((item) => !item.directory);
      if (!first) return;
      const value = await api.readWorkspaceFile(first.path);
      setTabs([{ path: first.path, value, dirty: false, diagnostics: [] }]);
      setActivePath(first.path);
      setNotice('');
    }).catch((error) => setNotice(error instanceof Error ? error.message : 'Workspace unavailable'));
    return () => { cancelled = true; };
  }, [api]);

  const openFile = useCallback(async (entry: WorkspaceEntry) => {
    if (entry.directory || tabs.some((tab) => tab.path === entry.path)) {
      setActivePath(entry.path);
      return;
    }
    try {
      const value = await api.readWorkspaceFile(entry.path);
      setTabs((current) => [...current, { path: entry.path, value, dirty: false, diagnostics: [] }]);
      setActivePath(entry.path);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to open file');
    }
  }, [api, tabs]);

  const saveActive = useCallback(async () => {
    if (!active) return;
    try {
      await api.writeWorkspaceFile(active.path, active.value);
      setTabs((current) => current.map((tab) => tab.path === active.path ? { ...tab, dirty: false } : tab));
      setNotice(`Saved ${active.path}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save file');
    }
  }, [active, api]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveActive();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [saveActive]);

  const diagnostics = useMemo(() => active?.diagnostics ?? [], [active]);
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100%', minWidth: 0 }}>
      <div role="tablist" aria-label="Open editors" style={{ display: 'flex', overflow: 'auto' }}>
        {tabs.map((tab) => (
          <button key={tab.path} role="tab" type="button" aria-selected={tab.path === activePath} onClick={() => setActivePath(tab.path)}>
            {tab.path}{tab.dirty ? ' •' : ''}
          </button>
        ))}
      </div>
      <div style={{ minHeight: 0 }}>
        {active ? (
          <MonacoEditor
            modelUri={`file:///${active.path}`}
            value={active.value}
            language={languageForPath(active.path)}
            theme={themeMode === 'dark' || themeMode === 'system' ? 'irislens-dark' : 'irislens-light'}
            onChange={(value) => setTabs((current) => current.map((tab) => tab.path === active.path ? { ...tab, value, dirty: true } : tab))}
            onDiagnostics={(items) => setTabs((current) => current.map((tab) => tab.path === active.path ? { ...tab, diagnostics: items } : tab))}
            onFallback={() => setNotice('Monaco unavailable; using plain text fallback')}
          />
        ) : <div style={{ padding: 12 }}>{notice}</div>}
      </div>
      <div role="status" style={{ padding: 4, borderTop: '1px solid rgba(128,128,128,.3)' }}>
        {notice || `${activePath ?? ''} · ${diagnostics.length} diagnostics`}
      </div>
      <ul aria-label="Workspace files" style={{ display: 'none' }}>
        {entries.map((entry) => <li key={entry.path}><button type="button" onClick={() => void openFile(entry)}>{entry.name}</button></li>)}
      </ul>
    </div>
  );
}
