export const agentPanelRange = { minWidth: 340, maxWidth: 420 } as const;

export function clampAgentWidth(width: number): number {
  return Math.min(agentPanelRange.maxWidth, Math.max(agentPanelRange.minWidth, Math.round(width)));
}
