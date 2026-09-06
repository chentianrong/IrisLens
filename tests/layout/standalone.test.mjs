import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { verifyLayout } from '../../scripts/verify-layout.mjs';

describe('standalone repository layout', () => {
  it('requires standalone product paths without fork artifacts', async () => {
    const result = await verifyLayout();
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it('does not advertise a Code OSS fork as a runtime dependency', async () => {
    const [manifest, readme, builder] = await Promise.all([
      readFile(new URL('../../package.json', import.meta.url), 'utf8'),
      readFile(new URL('../../README.md', import.meta.url), 'utf8'),
      readFile(new URL('../../electron-builder.yml', import.meta.url), 'utf8')
    ]);
    expect(manifest).not.toContain('Code OSS-based');
    expect(readme).toContain('does not fork, vendor, bundle, launch, or repackage VS Code');
    expect(builder).not.toContain('Code OSS');
  });
});
