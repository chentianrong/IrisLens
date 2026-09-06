## 1. Standalone Baseline

- [x] 1.1 Remove fork-only build and verification references from product build configuration, release scripts, and documentation; verify `npm run build`, type checks, and tests no longer require `fork/vscode`.
- [x] 1.2 Define workbench layout tokens, theme tokens, and persistent layout state; verify unit tests cover activity rail, sidebar, editor, bottom panel, status bar, and Agent panel state.

## 2. IrisLens Workbench

- [x] 2.1 Implement the standalone activity rail, sidebar, editor area, bottom panel, and status bar with accessibility roles and keyboard navigation; verify layout and keyboard tests.
- [x] 2.2 Implement resizable and collapsible sidebar, bottom panel, and Agent panel states with persisted layout; verify resize bounds, collapse state, and restart recovery tests.
- [x] 2.3 Implement light, dark, and system-following themes across workbench chrome, Monaco, Agent panel, and settings; verify theme snapshot and system-preference tests.
- [x] 2.4 Reconnect the existing Agent panel, model gateway status, settings, and credential redaction behavior to the standalone shell; verify existing Agent and gateway regression tests pass.

## 3. Monaco Editing

- [x] 3.1 Add independent Monaco integration for workspace file open, edit, undo, redo, tabs, dirty state, and save; verify file-system IPC and editor integration tests.
- [x] 3.2 Implement diagnostics, completion, hover, definitions, and formatting presentation through Monaco's independent APIs; verify deterministic language-service fixture tests.
- [x] 3.3 Implement Monaco load-failure fallback to a plain text editor while retaining open, edit, and save behavior; verify fallback activation and degraded-editor notice.

## 4. Extension Host Foundation

- [x] 4.1 Add the Extension Host process lifecycle, JSON-RPC protocol, startup timeout, graceful shutdown, and crash detection; verify lifecycle integration tests.
- [x] 4.2 Implement VSIX extraction, manifest validation, version and engine checks, metadata storage, enablement, disablement, and removal; verify valid, malformed, incompatible, and duplicate package tests.
- [x] 4.3 Implement activation events, extension registry, command registration and execution, configuration reading, and configuration change events; verify activation and compatibility contract tests.
- [x] 4.4 Implement basic workspace and editor event subscriptions, foundational editor contribution points, and capability-filtered renderer updates; verify event batching and contribution tests.

## 5. Permissions and Resilience

- [x] 5.1 Implement capability declarations, permission prompts or policy decisions, scoped extension storage, and structured denial errors; verify file, network, workspace, UI, and secret access boundaries.
- [x] 5.2 Implement unsupported-API errors that preserve the Extension Host and are visible in extension diagnostics; verify the host remains healthy after unsupported calls.
- [x] 5.3 Implement Extension Host restart, enabled-state restoration, repeated-failure disablement, and user-visible failure diagnostics; verify crash recovery integration tests.

## 6. Language Services

- [x] 6.1 Add the LSP client for stdio language servers with initialize, capabilities, document synchronization, shutdown, and disconnect handling; verify against a fixture language server.
- [x] 6.2 Bridge LSP diagnostics, completion, hover, definitions, and formatting into Monaco while preserving cancellation and ordering; verify language feature integration tests.
- [x] 6.3 Mark language features degraded after LSP failure and retry in the background while Monaco text editing remains available; verify degraded state and recovery tests.

## 7. Open VSX and Local Installation

- [x] 7.1 Add Open VSX search, metadata, version selection, download, install, source labeling, and failure states; verify registry client tests and no Microsoft Marketplace default request.
- [x] 7.2 Add local VSIX selection and installation for development and offline use; verify valid installation, invalid manifest rejection, and source attribution tests.

## 8. Persistence and Migration

- [x] 8.1 Add persistence for layout, theme, installed extensions, enablement, permissions, extension configuration, and extension-private storage; verify restart recovery and scope isolation tests.
- [x] 8.2 Add safe migration for existing IrisLens Agent, gateway, settings, keychain, and conversation data; verify simulated upgrade tests retain valid data.

## 9. Verification and Packaging

- [x] 9.1 Add representative extension fixtures for commands, configuration, editor contributions, diagnostics, formatter, and LSP behavior; verify compatibility matrix tests.
- [x] 9.2 Add workbench accessibility, performance, startup, visual layout, and keyboard regression tests; verify agreed desktop thresholds pass.
- [x] 9.3 Update Electron packaging metadata, smoke checks, installer documentation, and release checks for the standalone architecture; verify package artifacts do not include or require `fork/vscode`.
- [ ] 9.4 Run the full verification pipeline across type checks, unit tests, integration tests, accessibility and performance checks, and packaged smoke tests; verify all required checks pass on Windows and Ubuntu packaging paths.
