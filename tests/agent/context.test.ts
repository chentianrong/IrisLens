import { describe, expect, it } from 'vitest';
import { buildRequestPayload, captureContext } from '../../src/agent/context.js';

describe('Agent context capture', () => {
  it('captures active file, selection, search, and explicit references without duplicates', () => {
    const context = captureContext({
      activeFile: { path: 'src/app.ts', content: 'export const app;' },
      selection: { path: 'src/app.ts', content: 'const app;' },
      search: { query: 'app', matches: [{ path: 'src/app.ts', content: 'app' }] },
      explicit: [{ id: 'active:src/app.ts', type: 'active-file', label: 'duplicate', path: 'src/app.ts' }]
    });
    expect(context.map((item) => item.id)).toEqual([
      'active:src/app.ts', 'selection:src/app.ts', 'search:app:src/app.ts:0'
    ]);
  });

  it('builds the outgoing payload with model and context', () => {
    const payload = buildRequestPayload({
      message: 'Explain this',
      model: 'gpt-test',
      context: [{ id: 'active:src/app.ts', type: 'active-file', label: 'app.ts', path: 'src/app.ts', content: 'code' }]
    });
    expect(payload).toMatchObject({ model: 'gpt-test', messages: [{ role: 'user', content: 'Explain this' }] });
    expect(payload.context[0]).toMatchObject({ path: 'src/app.ts', content: 'code' });
  });
});
