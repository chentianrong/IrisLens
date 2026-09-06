import { agentPanelRange, clampAgentWidth } from './layout.js';

export type ActivityView = 'explorer' | 'search' | 'extensions' | 'settings';
export type BottomPanelView = 'terminal' | 'problems' | 'output';

export type WorkbenchLayoutState = {
  activeActivity: ActivityView;
  activeBottom: BottomPanelView;
  sidebarOpen: boolean;
  sidebarWidth: number;
  bottomOpen: boolean;
  bottomHeight: number;
  agentOpen: boolean;
  agentCollapsed: boolean;
  agentWidth: number;
};

export const workbenchLayoutBounds = {
  sidebar: { minWidth: 180, maxWidth: 420 },
  bottom: { minHeight: 120, maxHeight: 480 },
  agent: agentPanelRange
} as const;

export const defaultWorkbenchLayout: WorkbenchLayoutState = {
  activeActivity: 'explorer',
  activeBottom: 'terminal',
  sidebarOpen: true,
  sidebarWidth: 220,
  bottomOpen: true,
  bottomHeight: 200,
  agentOpen: true,
  agentCollapsed: false,
  agentWidth: 380
};

const storageKey = 'irislens:workbench-layout';
const themeKey = 'irislens:theme';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));
}

export function normalizeWorkbenchLayout(value: Partial<WorkbenchLayoutState> | null | undefined): WorkbenchLayoutState {
  return {
    activeActivity: value?.activeActivity ?? defaultWorkbenchLayout.activeActivity,
    activeBottom: value?.activeBottom ?? defaultWorkbenchLayout.activeBottom,
    sidebarOpen: value?.sidebarOpen ?? defaultWorkbenchLayout.sidebarOpen,
    sidebarWidth: clamp(value?.sidebarWidth ?? defaultWorkbenchLayout.sidebarWidth, workbenchLayoutBounds.sidebar.minWidth, workbenchLayoutBounds.sidebar.maxWidth),
    bottomOpen: value?.bottomOpen ?? defaultWorkbenchLayout.bottomOpen,
    bottomHeight: clamp(value?.bottomHeight ?? defaultWorkbenchLayout.bottomHeight, workbenchLayoutBounds.bottom.minHeight, workbenchLayoutBounds.bottom.maxHeight),
    agentOpen: value?.agentOpen ?? defaultWorkbenchLayout.agentOpen,
    agentCollapsed: value?.agentCollapsed ?? defaultWorkbenchLayout.agentCollapsed,
    agentWidth: clampAgentWidth(value?.agentWidth ?? defaultWorkbenchLayout.agentWidth)
  };
}

export function loadWorkbenchLayout(storage: Pick<Storage, 'getItem'> = window.localStorage): WorkbenchLayoutState {
  try {
    const raw = storage.getItem(storageKey);
    return normalizeWorkbenchLayout(raw ? JSON.parse(raw) as Partial<WorkbenchLayoutState> : undefined);
  } catch {
    return defaultWorkbenchLayout;
  }
}

export function saveWorkbenchLayout(
  layout: WorkbenchLayoutState,
  storage: Pick<Storage, 'setItem'> = window.localStorage
): void {
  storage.setItem(storageKey, JSON.stringify(normalizeWorkbenchLayout(layout)));
}

export function loadThemePreference(storage: Pick<Storage, 'getItem'> = window.localStorage): 'light' | 'dark' | 'system' {
  const value = storage.getItem(themeKey);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function saveThemePreference(
  theme: 'light' | 'dark' | 'system',
  storage: Pick<Storage, 'setItem'> = window.localStorage
): void {
  storage.setItem(themeKey, theme);
}
