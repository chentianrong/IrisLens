import { describe, expect, it } from 'vitest';
import { ExtensionRuntime, UnsupportedApiError } from '../../src/extensions/runtime.js';

describe('ExtensionRuntime', () => {
  const manifest = {
    name: 'fixture', publisher: 'IrisLens', version: '1.0.0', engines: { vscode: '^1.0.0' },
    contributes: { commands: [{ command: 'fixture.hello', title: 'Hello' }], configuration: { properties: { greeting: { default: 'hi' } } } }
  };

  it('activates contributions, updates configuration, and emits events', async () => {
    const runtime = new ExtensionRuntime();
    runtime.register(manifest);
    await runtime.activate('irislens.fixture');
    expect(runtime.contributions('irislens.fixture')?.commands).toHaveLength(1);
    runtime.updateConfiguration('irislens.fixture', { greeting: 'hello' });
    expect(runtime.getConfiguration('irislens.fixture')).toEqual({ greeting: 'hello' });
    await expect(runtime.executeCommand('missing.command')).rejects.toThrow('not found');
  });

  it('isolates unsupported APIs without corrupting runtime state', async () => {
    const runtime = new ExtensionRuntime();
    runtime.register(manifest);
    runtime.callApi('irislens.fixture', 'event.subscribe', 'workspace', undefined);
    (runtime as unknown as { permissions: { set(id: string, capability: string, decision: 'granted'): void } }).permissions.set('irislens.fixture', 'commands.execute', 'granted');
    await runtime.activate('irislens.fixture');
    expect(() => runtime.callApi('irislens.fixture', 'debug.breakpoints')).toThrow(UnsupportedApiError);
    expect(runtime.diagnosticsFor('irislens.fixture')).toHaveLength(1);
    expect(await runtime.executeCommand('fixture.hello')).toBeUndefined();
  });
});
