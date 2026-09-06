import type { AgentWorkbenchApi } from '../api.js';
import type { DiscoveredSchema } from '../gateway/schema.js';
import type { ModelRoute } from '../gateway/settings.js';
import type { WorkspaceApi, WorkspaceEntry } from '../main/workspace-service.js';
import type { InstalledExtension } from '../extensions/registry.js';

export type WindowAgentApi = AgentWorkbenchApi & {
  saveModelRoute(route: Omit<ModelRoute, 'secretRef' | 'defaultChat'> & { defaultChat: boolean; apiKey: string }): Promise<ModelRoute>;
  schema(): Promise<DiscoveredSchema>;
  probeModel(route: { baseUrl: string; model: string }): Promise<{ category: string; status?: number; summary?: string }>;
  listWorkspaceFiles(path?: string): Promise<WorkspaceEntry[]>;
  readWorkspaceFile(path: string): Promise<string>;
  writeWorkspaceFile(path: string, content: string): Promise<void>;
  listExtensions(): Promise<InstalledExtension[]>;
  installLocalExtension(path: string): Promise<InstalledExtension>;
  searchExtensions(query: string): Promise<Array<{ id: string; name: string; publisher: string; version: string; description?: string; source: 'open-vsx' }>>;
  installOpenVsxExtension(id: string): Promise<InstalledExtension>;
  setExtensionEnabled(id: string, enabled: boolean): Promise<InstalledExtension>;
  setExtensionConfiguration(id: string, values: Record<string, unknown>): Promise<InstalledExtension>;
  setExtensionPermission(id: string, capability: string, granted: boolean): Promise<InstalledExtension>;
  readExtensionStorage<T>(id: string, key: string): Promise<T | undefined>;
  writeExtensionStorage<T>(id: string, key: string, value: T): Promise<void>;
};

declare global {
  interface Window {
    irislens?: WindowAgentApi;
  }
}

export function createWindowAgentApi(): WindowAgentApi {
  const api = window.irislens;
  if (!api) throw new Error('IrisLens preload API is unavailable');
  return api;
}
