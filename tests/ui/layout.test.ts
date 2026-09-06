import { describe, expect, it } from 'vitest';
import { agentPanelRange, clampAgentWidth } from '../../src/ui/layout.js';

describe('Agent desktop layout', () => {
  it('keeps panel width inside desktop bounds', () => {
    expect(agentPanelRange).toEqual({ minWidth: 340, maxWidth: 420 });
    expect(clampAgentWidth(200)).toBe(340);
    expect(clampAgentWidth(380)).toBe(380);
    expect(clampAgentWidth(1000)).toBe(420);
  });
});
