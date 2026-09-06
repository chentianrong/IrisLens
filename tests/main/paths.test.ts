import { describe, expect, it } from 'vitest';
import { userDataDirectory } from '../../src/main/paths.js';

describe('stable user-data paths', () => {
  it('uses platform directories', () => {
    expect(userDataDirectory('IrisLens', 'win32', '/home/test')).toContain('AppData');
    expect(userDataDirectory('IrisLens', 'linux', '/home/test')).toContain('.local/share/irislens');
  });
});
