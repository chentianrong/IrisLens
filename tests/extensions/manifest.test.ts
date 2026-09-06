import { describe, expect, it } from 'vitest';
import { extensionId, validateManifest, validSemver } from '../../src/extensions/manifest.js';

describe('extension manifests', () => {
  const manifest = { name: 'fixture', publisher: 'IrisLens', version: '1.2.3', engines: { vscode: '^1.0.0' } };

  it('validates required manifest fields', () => {
    expect(validateManifest(manifest)).toMatchObject({ name: 'fixture' });
    expect(extensionId(manifest)).toBe('irislens.fixture');
  });

  it('rejects incomplete or incompatible manifests', () => {
    expect(() => validateManifest({ ...manifest, name: '' })).toThrow('name');
    expect(() => validateManifest({ ...manifest, engines: {} })).toThrow('engine');
    expect(validSemver('1.2')).toBe(false);
  });
});
