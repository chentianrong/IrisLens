import { describe, expect, it } from 'vitest';
import { bundledSchema, discoverSchema } from '../../src/gateway/schema.js';

describe('LiteLLM schema adapter', () => {
  it('uses public metadata when valid', () => {
    const metadata = { version: '1.100.0', providers: [{ provider: 'azure', protocols: ['https'], requiredFields: ['api_key'], defaults: {}, compatibility: {} }] };
    const schema = discoverSchema(metadata);
    expect(schema.source).toBe('discovered');
    expect(schema.providers[0]?.provider).toBe('azure');
  });

  it('falls back with an explicit notice-worthy source', () => {
    expect(discoverSchema(null).source).toBe('bundled-fallback');
    expect(bundledSchema.version).toBe('1.100.0');
  });
});
