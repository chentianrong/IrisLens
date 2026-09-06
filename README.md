# IrisLens

IrisLens is a standalone AI IDE vertical slice with an IrisLens-owned workbench, Monaco editing, a first-class Agent panel, and an embedded LiteLLM gateway.

## Development

```bash
npm ci
npm run typecheck
npm test
```

IrisLens does not fork, vendor, bundle, launch, or repackage VS Code. Its shell is Electron plus React, its editor is independent Monaco, and extension execution is provided by the IrisLens Extension Host.

## Packaging

The CI workflow produces Windows x64 NSIS and Ubuntu 22.04+ AMD64 DEB artifacts. User data is retained in stable platform directories and is never deleted on uninstall.
