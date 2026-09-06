import { describe, expect, it } from 'vitest';
import { probeModel } from '../../src/gateway/probe.js';

describe('model probe', () => {
  it.each([
    [200, 'available'],
    [401, 'authentication'],
    [403, 'authentication'],
    [404, 'unavailable-model'],
    [422, 'configuration']
  ])('maps HTTP %i to %s', async (status, category) => {
    const result = await probeModel({ baseUrl: 'https://api.example.com', model: 'gpt-test' }, async () => new Response('provider', { status }));
    expect(result.category).toBe(category);
  });

  it('maps network failures', async () => {
    const result = await probeModel({ baseUrl: 'https://api.example.com', model: 'x' }, async () => { throw new Error('offline'); });
    expect(result).toMatchObject({ category: 'network', summary: 'offline' });
  });
});
