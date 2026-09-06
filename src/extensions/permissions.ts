export type CapabilityDecision = 'granted' | 'denied' | 'unavailable';

export class ExtensionPermissionManager {
  private readonly decisions = new Map<string, Map<string, CapabilityDecision>>();

  constructor(private readonly allowedCapabilities: string[] = ['workspace.read', 'workspace.write', 'network.fetch', 'editor.ui', 'commands.execute']) {}

  decide(extensionId: string, capability: string): CapabilityDecision {
    if (!this.allowedCapabilities.includes(capability)) return 'unavailable';
    const existing = this.decisions.get(extensionId)?.get(capability);
    return existing ?? 'denied';
  }

  set(extensionId: string, capability: string, decision: CapabilityDecision): void {
    if (!this.decisions.has(extensionId)) this.decisions.set(extensionId, new Map());
    this.decisions.get(extensionId)!.set(capability, decision);
  }

  assert(extensionId: string, capability: string): void {
    const decision = this.decide(extensionId, capability);
    if (decision !== 'granted') throw new Error(`Permission denied: ${capability} (${decision})`);
  }
}
