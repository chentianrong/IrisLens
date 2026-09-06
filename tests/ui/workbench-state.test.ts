import { beforeEach, describe, expect, it } from 'vitest';
import {
  defaultWorkbenchLayout,
  loadWorkbenchLayout,
  normalizeWorkbenchLayout,
  saveWorkbenchLayout,
  workbenchLayoutBounds
} from '../../src/ui/workbench-state.js';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

describe('workbench layout state', () => {
  let storage: MemoryStorage;
  beforeEach(() => { storage = new MemoryStorage(); });

  it('clamps all resizable regions', () => {
    const layout = normalizeWorkbenchLayout({ sidebarWidth: 999, bottomHeight: 1, agentWidth: 999 });
    expect(layout.sidebarWidth).toBe(workbenchLayoutBounds.sidebar.maxWidth);
    expect(layout.bottomHeight).toBe(workbenchLayoutBounds.bottom.minHeight);
    expect(layout.agentWidth).toBe(workbenchLayoutBounds.agent.maxWidth);
  });

  it('persists and restores layout after restart', () => {
    saveWorkbenchLayout({ ...defaultWorkbenchLayout, sidebarWidth: 360, bottomHeight: 420, agentWidth: 410 }, storage);
    expect(loadWorkbenchLayout(storage)).toMatchObject({ sidebarWidth: 360, bottomHeight: 420, agentWidth: 410 });
  });

  it('falls back to defaults for corrupt storage', () => {
    storage.setItem('irislens:workbench-layout', '{invalid');
    expect(loadWorkbenchLayout(storage)).toEqual(defaultWorkbenchLayout);
  });
});
