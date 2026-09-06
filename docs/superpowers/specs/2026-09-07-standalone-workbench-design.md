# IrisLens Standalone Workbench Design

## Summary

IrisLens will remove its build, runtime, packaging, and source-tree dependency on Visual Studio Code. The product will use a fully self-developed Electron application shell and workbench. Monaco Editor will be embedded as an independent editing component. IrisLens will provide its own Extension Host and a first-phase compatibility layer for the VS Code extension mechanism.

The user-approved compatibility target is **Phase A — Core Compatibility**: VSIX installation, manifest and contribution parsing, commands, configuration, activation events, foundational editor extension points, language extensions, and Language Server Protocol support. This does not guarantee that every Microsoft Marketplace or VS Code extension will run.

## Goals

- Build the title bar, activity bar, primary sidebar, editor area, bottom panel, status bar, Agent panel, and settings experience without using VS Code workbench code or UI assets.
- Preserve a VS Code / Cursor-like desktop layout and interaction model without copying protected brand assets or proprietary artwork.
- Embed Monaco as an independent editor component, not as VS Code workbench.
- Run compatible extensions in an isolated Extension Host process.
- Install extensions from Open VSX by default and local VSIX files for testing, offline use, and controlled distribution.
- Retain the existing Agent, model gateway, settings, persistence, and local storage capabilities while connecting them to the new workbench.

## Non-goals for Phase A

- Do not use Microsoft Marketplace as the default extension source.
- Do not support every VS Code API, proprietary Microsoft extension, Webview feature, custom editor, debugger adapter, or workbench UI contribution.
- Do not fork, vendor, patch, bundle, launch, or repackage VS Code.
- Do not copy VS Code, Cursor, or extension marketplace brand assets.
- Do not allow extensions to bypass IrisLens permission checks or directly access Electron internals.

## Architecture

The application has three main boundaries:

1. **Renderer / Workbench**
   - React application shell.
   - Monaco Editor.
   - Activity bar, sidebar, editor groups, bottom panel, status bar, Agent panel, and settings UI.
   - Renderer-owned UI contributed by compatible extensions after permission validation.
2. **Main Process**
   - Window lifecycle, workspace state, file-system access, security policy, and permission checks.
   - VSIX installation and extension registry.
   - Extension Host lifecycle and crash recovery.
   - Bridge between renderer services and extension processes.
3. **Extension Host**
   - Separate Node-based process.
   - Manifest validation and activation event handling.
   - IrisLens implementation of the core `vscode` compatibility surface.
   - Command, configuration, editor event, workspace, diagnostics, and LSP support.

The renderer must not load extension code directly. The Extension Host must not directly access Electron or native APIs. Every privileged operation passes through the Main Process permission boundary.

## Extension mechanism

The extension runtime will be built in IrisLens rather than reused from VS Code. It will parse VSIX packages and manifests, resolve contribution points, manage activation events, and expose a structured API adapter. The compatibility surface is versioned and capability-negotiated at extension activation.

Phase A includes:

- VSIX package installation and removal.
- Extension metadata, activation rules, command, configuration, and basic editor contribution parsing.
- Command registration and execution.
- Settings reading and change events.
- Workspace and editor event subscription.
- Basic diagnostics, formatting, completion, hover, definitions, and language-feature integration.
- Language Server Protocol client support for language extensions.

Open VSX is the default remote registry. Local VSIX installation remains supported as a first-class path. IrisLens will display source, version, requested permissions, activation state, and failure diagnostics for every extension.

## Editor and workbench

Monaco is responsible for text editing, syntax coloring, diagnostics presentation, completion, and language-aware interactions. The IrisLens workbench owns layout, tabs, file tree, search, terminal, panel, status bar, menus, and visual styling.

The default layout is the approved AI-first three-column model:

- 44–48 px activity rail.
- Collapsible sidebar for files, search, source control, and extensions.
- Monaco-centered editor group with optional split editors.
- Bottom panel for terminal, problems, output, and task feedback.
- Right-side Agent panel for chat, workspace context, task plans, diffs, and approvals.

The Agent panel remains a first-class surface. It may be opened, collapsed, resized, or closed without unloading the editor or workspace.

## Security and isolation

Extensions declare required capabilities. The Main Process validates requests and grants capabilities only after user consent where required. File, process, network, workspace, and UI capabilities are separately negotiated.

Extension storage is isolated per extension and workspace scope. Extensions cannot access arbitrary application secrets. The Agent, model gateway, and keychain remain under IrisLens control. Extension Host failures cannot terminate the main application or corrupt the workspace index.

## Persistence

IrisLens will persist:

- Window and workbench layout.
- Theme and display preferences.
- Installed extensions and enablement state.
- Extension configuration and permission grants.
- Extension private storage.
- Extension Host crash records and disablement decisions.

The existing SQLite and local settings model remains the basis for persistence. Existing Agent, gateway, settings, and keychain behavior is integrated into the new workbench rather than rewritten.

## Error handling

- Invalid VSIX manifests are rejected with specific reasons such as missing fields, unsupported engine range, or incompatible contribution data.
- An Extension Host crash triggers one automatic restart and restores enabled extension state. Repeated failure moves the extension into a disabled state with a user-visible diagnostic.
- Calls to unimplemented compatibility APIs return structured capability errors instead of crashing the host.
- LSP disconnects mark language features degraded while Monaco remains available for text editing. The client retries in the background.
- Monaco load failure falls back to a plain text editor so files remain openable.

## Testing

- Manifest, VSIX, and contribution parsing unit tests.
- `vscode` compatibility-layer contract tests.
- Extension Host lifecycle, activation, permission, and crash recovery tests.
- Open VSX search, download, and local VSIX installation integration tests.
- Monaco editing, language-feature, diagnostic, and fallback tests.
- Workbench layout, keyboard, theme, accessibility, and visual regression tests.
- Regression tests for Agent, gateway, settings, persistence, and packaging.

## Migration

Remove `fork/vscode`, `fork/upstream.json`, VS Code fork verification, and VS Code packaging dependencies from the product pipeline. Replace documentation and release checks with the standalone Electron + Monaco + IrisLens Extension Host architecture. VS Code is referenced only as the compatibility source for extension manifests and APIs.
