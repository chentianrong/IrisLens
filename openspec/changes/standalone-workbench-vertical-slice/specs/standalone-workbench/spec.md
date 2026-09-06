## Purpose

Provides an IrisLens-owned VS Code / Cursor-like desktop workbench with Monaco editing and first-class Agent integration, without depending on VS Code source or runtime.

## ADDED Requirements

### Requirement: Standalone desktop shell
The system SHALL launch an IrisLens desktop application shell without launching a VS Code process, loading VS Code workbench source, or depending on a VS Code fork artifact.

#### Scenario: Application startup
- **WHEN** the user launches IrisLens
- **THEN** the shell displays the IrisLens workbench and no VS Code workbench process is started

### Requirement: VS Code / Cursor-like layout
The workbench SHALL provide an activity rail, collapsible sidebar, editor area, bottom panel, status bar, and right-side Agent panel using IrisLens-owned UI.

#### Scenario: Core layout is present
- **WHEN** a workspace is opened
- **THEN** the user can access files from the sidebar, edit files in the editor area, view the status bar, and open or close the Agent panel

### Requirement: Monaco text editing
The workbench SHALL use an independent Monaco editor for opening, editing, undoing, redoing, and saving workspace text files.

#### Scenario: Edit and save a file
- **WHEN** the user changes a file in the editor and saves it
- **THEN** the workspace file is updated and the editor no longer reports unsaved changes

### Requirement: Theme behavior
The workbench SHALL provide light, dark, and system-following themes across the shell, editor chrome, panels, Agent panel, and settings.

#### Scenario: Switch to dark theme
- **WHEN** the user selects the dark theme
- **THEN** the shell and editor chrome update to dark colors without requiring an application restart

### Requirement: First-class Agent panel
The workbench SHALL present the existing Agent experience as a first-class panel that can be opened, collapsed, resized, and closed while the workspace and editor remain available.

#### Scenario: Agent panel state changes
- **WHEN** the user toggles the Agent panel
- **THEN** the editor and workspace remain available and the selected panel state persists across layout serialization

### Requirement: Editor fallback
The system SHALL preserve file opening and text editing when Monaco fails to initialize.

#### Scenario: Monaco initialization failure
- **WHEN** Monaco cannot load
- **THEN** the workbench opens the affected file in a plain text editor and displays a degraded-editor notice
