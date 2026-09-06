import { describe, expect, it, vi } from 'vitest';
import { MemorySecretStore } from '../../src/main/keychain.js';
import { renderDiagnostics, saveModelRoute, validateRoute } from '../../src/gateway/settings.js';

describe('secure model settings', () => {
  it('stores API keys in the secret store and persists only a reference', async () => {
    const secrets = new MemorySecretStore();
    const spy = vi.spyOn(secrets, 'setPassword');
    const route = await saveModelRoute({ id: 'default', baseUrl: 'https://api.example.com/', provider: 'openai-compatible', endpointProtocol: 'https', model: 'gpt-test', apiKey: 'sk-test' }, secrets);
    expect(route.secretRef).toBe('model-route:default');
    expect(spy).toHaveBeenCalledWith('IrisLens', route.secretRef, 'sk-test');
    expect(JSON.stringify(route)).not.toContain('sk-test');
  });

  it('masks diagnostics', () => {
    const route = { id: 'default', baseUrl: 'https://api.example.com', provider: 'openai-compatible', endpointProtocol: 'https' as const, model: 'gpt-test', defaultChat: true, secretRef: 'model-route:default' };
    expect(renderDiagnostics(route).apiKey).toBe('[REDACTED]');
  });

  it('rejects invalid routes', () => {
    expect(() => validateRoute({ baseUrl: 'ftp://x', provider: 'p', endpointProtocol: 'https', model: 'm', secretRef: 'r' })).toThrow();
    expect(() => validateRoute({ baseUrl: 'https://x?api_key=secret', provider: 'p', endpointProtocol: 'https', model: 'm', secretRef: '' })).toThrow();
  });
});
