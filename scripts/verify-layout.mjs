import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';

const requiredPaths = [
  'src/ui',
  'gateway/discover_schema.py',
  'gateway/requirements.lock',
  'src/persistence/database.ts',
  'tests/main',
  'tests/agent',
  'tests/gateway',
  'tests/ui',
  'tests/integration',
  '.github/workflows/ci.yml',
  'electron-builder.yml',
  'packaging/windows/upgrade-notes.md',
  'packaging/debian/irislens.desktop'
];

export async function verifyLayout(root = process.cwd(), paths = requiredPaths) {
  const missing = [];
  for (const relativePath of paths) {
    try {
      await access(join(root, relativePath), constants.F_OK);
    } catch {
      missing.push(relativePath);
    }
  }
  return { valid: missing.length === 0, missing };
}

const result = await verifyLayout();
if (!result.valid) {
  console.error(`IrisLens repository layout is incomplete. Missing: ${result.missing.join(', ')}`);
  process.exit(1);
}
console.log('IrisLens repository layout verified.');
