## Purpose

Provides the IrisLens desktop foundation: a Code OSS-based IDE shell that preserves familiar editing workflows while exposing the Agent as a first-class workspace surface.

## ADDED Requirements

### Requirement: IrisLens Desktop Launch
The system SHALL launch a desktop application shell built from a Code OSS fork and present the IrisLens product identity without replacing standard VS Code editing behavior.

#### Scenario: First launch
- **WHEN** the user launches IrisLens
- **THEN** an IDE workspace opens with editor, sidebar, panel, and status-bar regions available

#### Scenario: Baseline editing remains available
- **WHEN** the user opens and edits a supported source file
- **THEN** the editor provides syntax highlighting, folding, diagnostics, terminal access, and standard save behavior

### Requirement: Dual IDE and Agent Workspace
The system SHALL keep the editor as the core workspace while exposing an Agent panel as a first-class, resizable surface.

#### Scenario: Agent panel is reachable from the shell
- **WHEN** IrisLens opens
- **THEN** the user can open, close, collapse, and resize the Agent panel without leaving the IDE workspace

#### Scenario: Panel dimensions remain usable
- **WHEN** the Agent panel is shown
- **THEN** its width can be adjusted within the defined desktop layout range without hiding the editor

### Requirement: Consistent Visual System
The system SHALL apply a Fluent-style visual system with light, dark, and system-following themes and retain VS Code keyboard and layout conventions.

#### Scenario: Theme follows system
- **WHEN** the operating-system theme changes and IrisLens is set to follow the system
- **THEN** the shell and Agent surfaces update to the matching theme

#### Scenario: Dense desktop layout is preserved
- **WHEN** the Agent panel is open on a desktop-width window
- **THEN** the title bar, activity bar, sidebar, editor, Agent panel, and status bar remain visible and independently usable

### Requirement: Upstream Compatibility Boundary
The system SHALL retain compatibility with standard VS Code extensions and workspace behavior except where IrisLens explicitly adds Agent integration.

#### Scenario: Standard extension remains usable
- **WHEN** a compatible VS Code extension is installed and enabled
- **THEN** it operates in the IrisLens shell according to its normal workspace APIs
