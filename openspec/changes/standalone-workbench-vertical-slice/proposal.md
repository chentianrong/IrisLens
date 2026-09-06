## Why

The current vertical slice depends on a Code OSS fork for the shell, workbench, editor, extension host, and release path. That creates disproportionate packaging, upgrade, and maintenance cost for an IrisLens product that needs only a familiar VS Code / Cursor-style experience while retaining first-class Agent and extension capabilities.

## What Changes

- **BREAKING**: Replace the Code OSS fork, VS Code workbench runtime, VS Code extension host, and fork verification/release path with a self-developed Electron application shell.
- Rebuild the activity bar, primary sidebar, editor group, bottom panel, status bar, Agent panel, and settings integration as IrisLens-owned React workbench surfaces.
- Embed Monaco as an independent editor component; do not use VS Code workbench source, processes, packaging, or brand assets.
- Add an IrisLens Extension Host with a Phase A compatibility layer for VSIX manifests, contribution points, commands, configuration, activation events, basic editor APIs, language extensions, and LSP.
- Add extension installation from Open VSX by default and local VSIX as a first-class offline/debugging path. Do not connect to Microsoft Marketplace by default.
- Add capability negotiation, permission checks, isolated extension storage, structured API gaps, and Extension Host crash recovery.
- Remove `fork/vscode`, `fork/upstream.json`, and VS Code fork verification from the product build and release checks.
- Preserve the existing Agent, model gateway, settings, keychain, SQLite persistence, and recovery behavior while integrating them into the standalone workbench.
- Exclude full VS Code API parity, proprietary Microsoft extensions, Webviews, custom editors, debug adapters, full marketplace compatibility, and extension-controlled autonomous execution from this change.

## Capabilities

### New Capabilities

- `standalone-workbench`: The IrisLens-owned desktop layout, Monaco-based editing experience, workbench panels, theme behavior, Agent integration, and editor fallback behavior.
- `extension-runtime`: VSIX lifecycle, Open VSX and local installation, isolated Extension Host execution, core VS Code extension compatibility, permissions, language services, diagnostics, and crash recovery.

### Modified Capabilities

- None.

## Impact

- **Application shell**: Electron main lifecycle, React renderer, workbench state, IPC boundaries, Monaco integration, and Agent/settings embedding.
- **Extension system**: New Extension Host process, VSIX installer, registry, activation engine, compatibility API adapter, LSP client, permission boundary, and isolated storage.
- **Model and Agent systems**: Existing Agent workbench, gateway lifecycle, credential handling, and conversation persistence are retained and reconnected to the new shell.
- **Packaging and release**: Electron packaging must no longer include or validate a VS Code fork; installer metadata, smoke checks, and documentation must reflect the standalone architecture.
- **Compatibility**: This is not a guarantee that every VS Code extension will run. Extensions requiring unimplemented APIs or deeper workbench integration will be reported as unsupported instead of crashing IrisLens.
