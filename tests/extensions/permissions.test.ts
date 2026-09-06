import { describe, expect, it } from 'vitest';
import { ExtensionPermissionManager } from '../../src/extensions/permissions.js';

describe('extension permissions', () => {
  it('denies undeclared or ungranted capabilities by default', () => {
    const permissions = new ExtensionPermissionManager();
    expect(permissions.decide('x.y', 'workspace.read')).toBe('denied');
    expect(() => permissions.assert('x.y', 'workspace.read')).toThrow('Permission denied');
  });

  it('supports explicit grants, denial, and unavailable capabilities', () => {
    const permissions = new ExtensionPermissionManager();
    permissions.set('x.y', 'workspace.read', 'granted');
    permissions.set('x.y', 'network.fetch', 'denied');
    expect(permissions.decide('x.y', 'workspace.read')).toBe('granted');
    expect(permissions.decide('x.y', 'network.fetch')).toBe('denied');
    expect(permissions.decide('x.y', 'native.process')).toBe('unavailable');
  });
});
