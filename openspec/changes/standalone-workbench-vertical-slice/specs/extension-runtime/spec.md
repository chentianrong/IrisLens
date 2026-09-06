## Purpose

Provides an isolated IrisLens Extension Host and a Phase A VS Code extension compatibility layer for installing, activating, running, and recovering compatible extensions.

## ADDED Requirements

### Requirement: VSIX installation
The system SHALL install valid local VSIX packages and remove installed extensions while preserving application stability.

#### Scenario: Install a valid VSIX
- **WHEN** the user selects a valid VSIX file
- **THEN** IrisLens parses its manifest, records the extension as installed, and makes it available for activation

#### Scenario: Reject an invalid VSIX
- **WHEN** the selected package has a missing or incompatible manifest
- **THEN** IrisLens refuses installation and reports the concrete validation failure

### Requirement: Default Open VSX source
The extension view SHALL search and install compatible extensions from Open VSX by default and SHALL NOT use Microsoft Marketplace as the default source.

#### Scenario: Search Open VSX
- **WHEN** the user searches the extensions view
- **THEN** IrisLens queries Open VSX and displays compatible results with source and version information

### Requirement: Isolated Extension Host
The system SHALL execute extension code in a separate Extension Host process and SHALL NOT load extension code directly into the renderer.

#### Scenario: Extension activation
- **WHEN** an enabled extension matches its activation event
- **THEN** its code runs in the Extension Host and interacts with the workbench only through the compatibility boundary

### Requirement: Core compatibility surface
The Extension Host SHALL support VSIX activation events, commands, configuration access and change events, basic workspace and editor events, foundational editor extension points, diagnostics, and language extensions that use LSP.

#### Scenario: Register a command
- **WHEN** an extension contributes and activates a command
- **THEN** the command is discoverable through the IrisLens command surface and can execute through the compatibility layer

#### Scenario: Provide language features
- **WHEN** an LSP-based language extension is activated for an open file
- **THEN** Monaco can receive diagnostics, completion, hover, definitions, or formatting provided by the language server

### Requirement: Capability permissions
The system SHALL negotiate extension capabilities and SHALL route privileged file, process, network, workspace, and UI operations through IrisLens permission checks.

#### Scenario: Denied privileged operation
- **WHEN** an extension requests a capability that is unavailable or denied
- **THEN** the Extension Host receives a structured permission error and the shell records the denial without granting the operation

### Requirement: Missing API isolation
The system SHALL return a structured unsupported-capability error when an extension calls an API outside the Phase A compatibility surface.

#### Scenario: Unsupported API call
- **WHEN** an extension calls an unimplemented API
- **THEN** the call fails with a structured unsupported-capability error and the Extension Host remains running

### Requirement: Crash recovery
The system SHALL restart a failed Extension Host once, restore enabled extension state, and disable repeatedly failing extensions with a visible diagnostic.

#### Scenario: Extension Host crashes
- **WHEN** the Extension Host exits unexpectedly
- **THEN** IrisLens restarts it, restores the prior enabled-extension state, and keeps the workbench usable

#### Scenario: Repeated extension failure
- **WHEN** the same extension repeatedly crashes the Extension Host
- **THEN** IrisLens disables that extension, preserves the rest of the runtime, and displays the failure reason
