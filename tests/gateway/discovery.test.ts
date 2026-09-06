import { describe, expect, it } from 'vitest';
import { extractRuntimeSchema } from '../../src/gateway/discovery.js';

describe('runtime schema discovery', () => {
  it('extracts the bundled LiteLLM version and public providers', async () => {
    const schema = await extractRuntimeSchema('python', async () => JSON.stringify({
      version: '1.100.0',
      providers: [{ provider: 'azure', protocols: ['https'], requiredFields: ['api_key'], defaults: {}, compatibility: {} }]
    }));
    expect(schema).toMatchObject({ version: '1.100.0', source: 'discovered' });
  });

  it('uses the bundled fallback on extraction failure', async () => {
    const schema = await extractRuntimeSchema('python', async () => { throw new Error('import failed'); });
    expect(schema.source).toBe('bundled-fallback');
  });
});
