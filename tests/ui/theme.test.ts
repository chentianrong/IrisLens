import { describe, expect, it } from 'vitest';
import { darkTokens, lightTokens, resolveTokens } from '../../src/ui/theme/tokens.js';

describe('theme tokens', () => {
  it('maps light, dark, and system modes', () => {
    expect(resolveTokens('light')).toEqual(lightTokens);
    expect(resolveTokens('dark')).toEqual(darkTokens);
    expect(resolveTokens('system', false)).toEqual(lightTokens);
    expect(resolveTokens('system', true)).toEqual(darkTokens);
  });
});
