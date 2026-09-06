import { useCallback, useEffect, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { clampAgentWidth } from './layout.js';
import { darkTokens, lightTokens, type ThemeMode } from './theme/tokens.js';
import {
  defaultWorkbenchLayout,
  normalizeWorkbenchLayout,
  workbenchLayoutBounds,
  type ActivityView,
  type BottomPanelView,
  type WorkbenchLayoutState
} from './workbench-state.js';

export type WorkbenchProps = {
  themeMode: ThemeMode;
  systemPrefersDark?: boolean;
  onThemeChange: (mode: ThemeMode) => void;
  agent?: ReactNode | ((width: number) => ReactNode);
  settings?: ReactNode;
  extensions?: ReactNode;
  editor?: ReactNode;
  initialLayout?: WorkbenchLayoutState;
  onLayoutChange?: (layout: WorkbenchLayoutState) => void;
};

const activityItems: Array<{ id: ActivityView; label: string }> = [
  { id: 'explorer', label: 'Files' },
  { id: 'search', label: 'Search' },
  { id: 'extensions', label: 'Extensions' },
  { id: 'settings', label: 'Settings' }
];

const bottomItems: Array<{ id: BottomPanelView; label: string }> = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'problems', label: 'Problems' },
  { id: 'output', label: 'Output' }
];

export function Workbench({
  themeMode,
  systemPrefersDark = false,
  onThemeChange,
  agent,
  settings,
  extensions,
  editor,
  initialLayout,
  onLayoutChange
}: WorkbenchProps): ReactElement {
  const [layout, setLayout] = useState<WorkbenchLayoutState>(() => normalizeWorkbenchLayout(initialLayout ?? defaultWorkbenchLayout));
  const [activeAgentView, setActiveAgentView] = useState<'agent' | 'settings'>('agent');
  const tokens = themeMode === 'dark' || (themeMode === 'system' && systemPrefersDark) ? darkTokens : lightTokens;
  const showAgent = layout.agentOpen && !layout.agentCollapsed;
  const panelWidth = clampAgentWidth(layout.agentWidth);
  const agentContent = typeof agent === 'function' ? agent(panelWidth) : agent;

  const updateLayout = useCallback((patch: Partial<WorkbenchLayoutState>) => {
    setLayout((current) => {
      const next = normalizeWorkbenchLayout({ ...current, ...patch });
      onLayoutChange?.(next);
      return next;
    });
  }, [onLayoutChange]);

  useEffect(() => {
    if (initialLayout) setLayout(normalizeWorkbenchLayout(initialLayout));
  }, [initialLayout]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      updateLayout({ sidebarOpen: !layout.sidebarOpen });
    }
    if (event.key.toLowerCase() === 'j') {
      event.preventDefault();
      updateLayout({ bottomOpen: !layout.bottomOpen });
    }
    if (event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      updateLayout({ agentOpen: true, agentCollapsed: false });
    }
  };

  return (
    <div
      aria-label="IrisLens workspace"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateColumns: `48px ${layout.sidebarOpen ? `${layout.sidebarWidth}px` : '0'} 1fr auto`,
        height: '100%',
        minHeight: 0,
        color: tokens.colorNeutralForeground,
        backgroundColor: tokens.colorNeutralBackground,
        outline: 'none'
      }}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <header style={{ gridColumn: '1 / 4', display: 'flex', alignItems: 'center', gap: tokens.spacingS, padding: tokens.spacingS }}>
        <strong>IrisLens</strong>
        <button type="button" onClick={() => { updateLayout({ agentOpen: true, agentCollapsed: false }); setActiveAgentView('agent'); }}>Agent</button>
        <button type="button" onClick={() => { updateLayout({ agentOpen: true, agentCollapsed: false }); setActiveAgentView('settings'); }}>Settings</button>
        <button type="button" onClick={() => updateLayout({ sidebarOpen: !layout.sidebarOpen })}>Toggle Sidebar</button>
        <button type="button" onClick={() => updateLayout({ bottomOpen: !layout.bottomOpen })}>Toggle Panel</button>
        <button type="button" onClick={() => updateLayout({ agentOpen: false })} disabled={!layout.agentOpen}>Close Agent</button>
        <button type="button" onClick={() => updateLayout({ agentCollapsed: true })} disabled={!layout.agentOpen || layout.agentCollapsed}>Collapse Agent</button>
        <button type="button" onClick={() => updateLayout({ agentOpen: true, agentCollapsed: false })} disabled={showAgent}>Open Agent</button>
        <label style={{ marginLeft: 'auto' }}>
          Theme
          <select aria-label="Theme" value={themeMode} onChange={(event) => onThemeChange(event.target.value as ThemeMode)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
      </header>

      <nav aria-label="Activity bar" style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingS, padding: tokens.spacingS }}>
        {activityItems.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={layout.activeActivity === item.id ? 'true' : undefined}
            onClick={() => {
              updateLayout({ activeActivity: item.id, sidebarOpen: layout.activeActivity === item.id ? !layout.sidebarOpen : true });
              setActiveAgentView(item.id === 'settings' ? 'settings' : 'agent');
            }}
          >
            {item.label.slice(0, 2)}
          </button>
        ))}
      </nav>

      {layout.sidebarOpen ? (
        <aside
          aria-label="Sidebar"
          style={{ width: layout.sidebarWidth, minWidth: layout.sidebarWidth, overflow: 'auto', padding: tokens.spacingM, borderRight: `1px solid ${tokens.colorNeutralStroke}` }}
        >
          <div role="tablist" aria-label="Sidebar views">
            {activityItems.map((item) => (
              <button key={item.id} role="tab" type="button" aria-selected={layout.activeActivity === item.id} onClick={() => updateLayout({ activeActivity: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
          <section aria-label={`${activityItems.find((item) => item.id === layout.activeActivity)?.label} view`}>
            {layout.activeActivity === 'settings' ? settings : layout.activeActivity === 'extensions' ? extensions : activityItems.find((item) => item.id === layout.activeActivity)?.label}
          </section>
        </aside>
      ) : null}

      <main style={{ display: 'grid', gridTemplateRows: '1fr auto', gridTemplateColumns: '1fr auto', minWidth: 0 }}>
        <section aria-label="Editor" style={{ borderRight: `1px solid ${tokens.colorNeutralStroke}`, minWidth: 0, overflow: 'hidden' }}>
          {editor ?? <div style={{ padding: tokens.spacingM }}>Editor</div>}
        </section>
        {showAgent ? (
          <section
            aria-label="Agent panel"
            data-panel-state="open"
            style={{ width: panelWidth, minWidth: panelWidth, overflow: 'hidden' }}
          >
            {activeAgentView === 'agent' ? agentContent : settings}
          </section>
        ) : null}
        {layout.bottomOpen ? (
          <section
            aria-label="Bottom panel"
            style={{ gridColumn: 1, height: layout.bottomHeight, minHeight: layout.bottomHeight, borderTop: `1px solid ${tokens.colorNeutralStroke}`, overflow: 'auto', padding: tokens.spacingM }}
          >
            <div role="tablist" aria-label="Bottom panel views">
              {bottomItems.map((item) => (
                <button key={item.id} role="tab" type="button" aria-selected={layout.activeBottom === item.id} onClick={() => updateLayout({ activeBottom: item.id })}>
                  {item.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" aria-label={bottomItems.find((item) => item.id === layout.activeBottom)?.label}>
              {layout.activeBottom === 'terminal' ? 'Terminal' : layout.activeBottom === 'problems' ? 'No problems' : 'Output'}
            </div>
          </section>
        ) : null}
      </main>

      <footer role="status" style={{ gridColumn: '1 / 4', padding: tokens.spacingS, borderTop: `1px solid ${tokens.colorNeutralStroke}` }}>
        Agent: {showAgent ? 'visible' : 'hidden'} · Width: {panelWidth}px · Sidebar: {layout.sidebarOpen ? 'open' : 'closed'} · Panel: {layout.bottomOpen ? 'open' : 'closed'}
      </footer>
      <input
        aria-label="Agent panel width"
        type="range"
        min={workbenchLayoutBounds.agent.minWidth}
        max={workbenchLayoutBounds.agent.maxWidth}
        value={panelWidth}
        onChange={(event) => updateLayout({ agentWidth: Number(event.target.value) })}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      <input
        aria-label="Sidebar width"
        type="range"
        min={workbenchLayoutBounds.sidebar.minWidth}
        max={workbenchLayoutBounds.sidebar.maxWidth}
        value={layout.sidebarWidth}
        onChange={(event) => updateLayout({ sidebarWidth: Number(event.target.value) })}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
      <input
        aria-label="Bottom panel height"
        type="range"
        min={workbenchLayoutBounds.bottom.minHeight}
        max={workbenchLayoutBounds.bottom.maxHeight}
        value={layout.bottomHeight}
        onChange={(event) => updateLayout({ bottomHeight: Number(event.target.value) })}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
    </div>
  );
}
