## Context

IrisLens already has an Electron-based Agent, gateway, settings, keychain, and persistence foundation, but the planned IDE path still assumes a Code OSS fork. A standalone shell can preserve the familiar desktop model while making the workbench and extension runtime explicit IrisLens components.

## Goals / Non-Goals

**Goals:**

- Build every workbench surface and visual layout decision as IrisLens-owned React code.
- Embed Monaco without importing VS Code workbench behavior, lifecycle, or source tree.
- Provide a Phase A VS Code extension compatibility surface strong enough for common command, configuration, editor, and LSP workflows.
- Keep extension execution isolated from renderer, Main Process, secrets, and unrestricted native access.
- Retain existing Agent, gateway, settings, keychain, and persistence behavior.

**Non-Goals:**

- No fork, vendor, patch, launch, or repackage VS Code.
- No Microsoft Marketplace client, full VS Code API parity, Webviews, custom editors, debug adapters, or proprietary Microsoft extension support.
- No copying VS Code or Cursor brand assets.
- No extension-controlled autonomous terminal execution.

## Decisions

### Electron + React workbench

IrisLens will build the shell, activity bar, sidebar, editor groups, bottom panel, status bar, Agent panel, and settings containers with React and existing IrisLens design tokens. This is preferred to a Code OSS fork because the product no longer needs VS Code's full workbench and avoids upstream patch maintenance. It is also preferred to wrapping a complete editor application because IrisLens needs Agent-first integration and explicit ownership of layout and IPC.

Alternative considered: keep the fork for faster editor parity. Rejected because it preserves the dependency the user explicitly wants to remove and continues to couple release size, upgrades, and compatibility to VS Code.

### Monaco as an editing component

Monaco will provide text editing, language-aware presentation, diagnostics rendering, completion, hover, and formatting interactions. It will not provide menus, workbench views, extension loading, terminal, or window lifecycle.

Alternative considered: CodeMirror 6. Rejected for Phase A because Monaco gives a closer VS Code-like editing and API experience. CodeMirror can be evaluated later as a lighter runtime option if bundle size outweighs editor compatibility.

### Independent IrisLens Extension Host

IrisLens will run a separate Node-based Extension Host process. It will parse VSIX packages, register contributions, evaluate activation events, and expose a versioned compatibility adapter. JSON-RPC will connect the host to Main Process services; renderer UI will receive only validated, capability-filtered state and requests.

This is preferred to reusing a bundled VS Code extension host because it keeps the shell independent, and preferred to a thin command bridge because command execution alone cannot support configuration, workspace events, diagnostics, and LSP-based extensions.

### Phase A compatibility boundary

The compatibility layer will cover VSIX installation and manifest parsing; commands; configuration and change events; activation events; basic workspace and editor events; foundational editor contribution points; diagnostics; and language extensions using LSP. Unsupported APIs return structured capability errors. This provides a useful ecosystem slice without pretending that every VS Code extension can run.

Alternative considered: target broad API parity immediately. Rejected because Webviews, custom editors, debuggers, and UI contribution APIs would add substantial security and lifecycle complexity before core editing workflows are proven.

### Open VSX plus local VSIX

Open VSX is the default remote registry because it is an open extension source and avoids treating Microsoft Marketplace as an assumed IrisLens dependency. Local VSIX remains supported for development, offline installation, enterprise distribution, and reproducible tests.

### Permission and isolation model

Extensions declare capabilities. The Main Process validates requests and grants only negotiated capabilities. File, process, network, workspace, and UI permissions are tracked separately. Extension storage is scoped per extension and workspace. This limits the blast radius of malicious or buggy extensions.

Alternative considered: give the Extension Host broad Node access for compatibility. Rejected because many VS Code extensions assume trusted desktop access, while IrisLens needs an explicit boundary for workspace files, Agent context, gateway credentials, and user approval.

## Risks / Trade-offs

- [Popular extensions use APIs outside Phase A] → Display unsupported-capability diagnostics instead of crashing; track API gaps as explicit compatibility data.
- [VSIX contribution formats vary] → Validate manifests strictly and add compatibility tests for representative command, configuration, language, diagnostics, and formatter extensions.
- [Monaco increases bundle size and startup cost] → Load Monaco only for editor surfaces, measure startup and interaction budgets, and retain the plain-text fallback.
- [Extension Host IPC adds latency] → Batch editor and workspace events, avoid high-frequency payloads, and measure activation and language-feature response times.
- [Users expect Microsoft Marketplace] → Clearly label Open VSX as the default source and support explicit local VSIX installation without silently violating marketplace terms.

## Migration Plan

1. Remove fork-only build, packaging, verification, and documentation paths.
2. Add the standalone workbench while preserving current Agent, gateway, settings, and persistence modules.
3. Introduce Monaco and editor lifecycle behind explicit IPC and fallback behavior.
4. Add the Extension Host, VSIX registry, activation engine, compatibility adapter, permissions, and LSP client.
5. Add migration for layout, theme, installed extensions, enablement, permissions, configuration, and extension-private storage.
6. Validate workbench, extension, Agent, gateway, persistence, accessibility, performance, and packaging tests before release.

Rollback is not intended to restore the Code OSS runtime after this change. Runtime rollback requires returning to the previous application generation, while user data remains in stable IrisLens-owned storage locations.

## Open Questions

None. The Phase A compatibility boundary and registry choices were approved during design review.
