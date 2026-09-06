import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateManifest } from '../../src/extensions/manifest.js';
import { ExtensionRuntime } from '../../src/extensions/runtime.js';

const fixtures = 'tests/fixtures/extensions';

describe('Phase A compatibility matrix', () => {
  it('covers command, configuration, and language fixtures', async () => {
    const command = validateManifest(JSON.parse(await readFile(join(fixtures, 'command-extension/package.json'), 'utf8')));
    const language = validateManifest(JSON.parse(await readFile(join(fixtures, 'language-extension/package.json'), 'utf8')));
    const runtime = new ExtensionRuntime();
    runtime.register(command);
    runtime.register(language);
    await runtime.activate('irislens.command-fixture');
    await runtime.activate('irislens.language-fixture');
    expect(runtime.contributions('irislens.command-fixture')?.commands?.[0]?.command).toBe('fixture.ping');
    expect(runtime.contributions('irislens.language-fixture')?.languages?.[0]?.id).toBe('irislens');
    runtime.updateConfiguration('irislens.command-fixture', { 'fixture.greeting': 'configured' });
    expect(runtime.getConfiguration('irislens.command-fixture')['fixture.greeting']).toBe('configured');
  });
});
