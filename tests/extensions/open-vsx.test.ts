import { describe, expect, it, vi } from 'vitest';
import { OpenVsxClient } from '../../src/extensions/open-vsx.js';

describe('OpenVsxClient', () => {
  it('searches Open VSX and maps download metadata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      extensions: [{ name: 'fixture', namespace: 'IrisLens', version: '1.0.0', description: 'Fixture', files: { download: 'https://open-vsx.org/fixture.vsix' } }]
    }), { status: 200 }));
    const client = new OpenVsxClient('https://open-vsx.org/api', fetchImpl as unknown as typeof fetch);
    const results = await client.search('fixture');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: 'irislens.fixture', source: 'open-vsx', downloadUrl: 'https://open-vsx.org/fixture.vsix' });
    expect(fetchImpl.mock.calls[0]?.[0]).toContain('open-vsx.org');
    expect(fetchImpl.mock.calls[0]?.[0]).not.toContain('marketplace.visualstudio.com');
  });

  it('surfaces registry failures', async () => {
    const client = new OpenVsxClient('https://open-vsx.org/api', vi.fn().mockResolvedValue(new Response('no', { status: 500 })) as unknown as typeof fetch);
    await expect(client.search('fixture')).rejects.toThrow('Open VSX request failed (500)');
  });
});
