
export type ExtensionManifest = {
  name: string;
  publisher: string;
  version: string;
  displayName?: string;
  description?: string;
  main?: string;
  activationEvents?: string[];
  engines: { vscode?: string; irislens?: string };
  contributes?: {
    commands?: Array<{ command: string; title: string }>;
    configuration?: { properties?: Record<string, unknown> };
    languages?: Array<{ id: string; extensions?: string[] }>;
  };
  irislens?: { capabilities?: string[] };
};

export type ParsedExtensionId = { publisher: string; name: string; id: string };

export function validSemver(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

export function validateManifest(value: unknown): ExtensionManifest {
  if (typeof value !== 'object' || value === null) throw new Error('Extension manifest is not an object');
  const manifest = value as ExtensionManifest;
  if (typeof manifest.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/i.test(manifest.name)) throw new Error('Manifest name is invalid');
  if (typeof manifest.publisher !== 'string' || !manifest.publisher.trim()) throw new Error('Manifest publisher is missing');
  if (typeof manifest.version !== 'string' || !validSemver(manifest.version)) throw new Error('Manifest version is invalid');
  if (!manifest.engines || typeof manifest.engines !== 'object') throw new Error('Manifest engines are missing');
  const engine = manifest.engines.vscode ?? manifest.engines.irislens;
  if (typeof engine !== 'string' || !engine.trim()) throw new Error('Manifest engine range is missing');
  return manifest;
}

export function extensionId(manifest: Pick<ExtensionManifest, 'publisher' | 'name'>): string {
  return `${manifest.publisher.toLowerCase()}.${manifest.name.toLowerCase()}`;
}
