import type { SecretStore } from '../types.js';
import type { ProviderSchema } from './schema.js';

export interface ModelRoute {
  id: string;
  baseUrl: string;
  provider: string;
  endpointProtocol: 'http' | 'https';
  model: string;
  defaultChat: boolean;
  secretRef: string;
}

export const secretService = 'IrisLens';

export function secretRefFor(routeId: string): string {
  return `model-route:${routeId}`;
}

export async function saveModelRoute(
  route: Omit<ModelRoute, 'secretRef' | 'defaultChat'> & { defaultChat?: boolean; apiKey: string },
  secrets: SecretStore,
  existing?: ModelRoute
): Promise<ModelRoute> {
  validateRoute({ ...route, secretRef: '' });
  const secretRef = secretRefFor(route.id);
  await secrets.setPassword(secretService, secretRef, route.apiKey);
  return {
    id: route.id,
    baseUrl: route.baseUrl.replace(/\/$/, ''),
    provider: route.provider,
    endpointProtocol: route.endpointProtocol,
    model: route.model,
    defaultChat: route.defaultChat ?? false,
    secretRef
  };
}

export function validateRoute(route: Pick<ModelRoute, 'baseUrl' | 'provider' | 'endpointProtocol' | 'model' | 'secretRef'>): void {
  if (!/^https?:\/\//.test(route.baseUrl)) throw new Error('Base URL must use http or https');
  if (!route.baseUrl.startsWith(`${route.endpointProtocol}://`)) throw new Error('Base URL does not match endpoint protocol');
  if (!route.provider.trim()) throw new Error('Provider is required');
  if (!route.model.trim()) throw new Error('Model name is required');
  if (!route.secretRef && route.baseUrl.toLowerCase().includes('api_key=')) throw new Error('API keys are not allowed in the base URL');
}

export function renderDiagnostics(route: ModelRoute): Record<string, unknown> {
  return {
    id: route.id,
    baseUrl: route.baseUrl,
    provider: route.provider,
    endpointProtocol: route.endpointProtocol,
    model: route.model,
    defaultChat: route.defaultChat,
    apiKey: '[REDACTED]'
  };
}

export function selectedProvider(schemaProviders: ProviderSchema[], provider: string): ProviderSchema | undefined {
  return schemaProviders.find((item) => item.provider === provider);
}
