import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { resolveTokens, type ThemeMode } from './theme/tokens.js';
import { Workbench } from './Workbench.js';
import { WorkspaceEditor } from './editor/WorkspaceEditor.js';
import { ExtensionsView } from './extensions/ExtensionsView.js';
import { AgentWorkbench } from './agent/AgentWorkbench.js';
import { createWindowAgentApi } from './windowApi.js';
import { SettingsContainer } from './settings/SettingsContainer.js';
import {
  loadThemePreference,
  loadWorkbenchLayout,
  saveThemePreference,
  saveWorkbenchLayout,
  type WorkbenchLayoutState
} from './workbench-state.js';

export type AppProps = {
  themeMode?: ThemeMode;
  systemPrefersDark?: boolean;
};

export function App({ themeMode: initialThemeMode, systemPrefersDark: initialSystemPrefersDark = false }: AppProps): ReactElement {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => initialThemeMode ?? loadThemePreference());
  const [layout, setLayout] = useState<WorkbenchLayoutState>(() => loadWorkbenchLayout());
  const [systemPrefersDark, setSystemPrefersDark] = useState(initialSystemPrefersDark);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(query.matches);
    const listener = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  useEffect(() => { saveThemePreference(themeMode); }, [themeMode]);
  useEffect(() => { saveWorkbenchLayout(layout); }, [layout]);
  const fluentTheme = resolveTokens(themeMode, systemPrefersDark);
  const agentApi = useMemo(() => createWindowAgentApi(), []);
  return (
    <FluentProvider theme={fluentTheme as never} style={{ height: '100vh' }}>
      <Workbench
        themeMode={themeMode}
        systemPrefersDark={systemPrefersDark}
        onThemeChange={setThemeMode}
        initialLayout={layout}
        onLayoutChange={setLayout}
        editor={<WorkspaceEditor api={agentApi} themeMode={themeMode} />}
        extensions={<ExtensionsView api={agentApi} />}
        agent={(width) => <AgentWorkbench api={agentApi} width={width} />}
        settings={<SettingsContainer tokens={fluentTheme} api={agentApi} />}
      />
    </FluentProvider>
  );
}
