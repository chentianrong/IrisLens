export interface ProviderSchema {
  provider: string;
  protocols: string[];
  requiredFields: string[];
  defaults: Record<string, string>;
  compatibility: Record<string, string[]>;
}

export interface DiscoveredSchema {
  version: string;
  source: 'discovered' | 'bundled-fallback';
  providers: ProviderSchema[];
}

export const bundledSchemaVersion = '1.100.0';

export const bundledSchema: DiscoveredSchema = {
  version: bundledSchemaVersion,
  source: 'bundled-fallback',
  providers: [
    {
      provider: 'openai-compatible',
      protocols: ['http', 'https'],
      requiredFields: ['base_url', 'api_key', 'model'],
      defaults: { endpoint_protocol: 'https', api_version: '' },
      compatibility: { streaming: ['chat/completions'] }
    }
  ]
};

export interface LiteLLMMetadata {
  version: string;
  providers: ProviderSchema[];
}

export function discoverSchema(metadata?: LiteLLMMetadata | null): DiscoveredSchema {
  if (!metadata?.version || !Array.isArray(metadata.providers) || metadata.providers.length === 0) {
    return { ...bundledSchema, version: metadata?.version ?? bundledSchemaVersion };
  }
  return { version: metadata.version, source: 'discovered', providers: metadata.providers };
}
