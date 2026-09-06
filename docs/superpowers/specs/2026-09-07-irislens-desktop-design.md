# IrisLens Desktop Design

## Summary

IrisLens is a cross-platform desktop AI IDE with Windows as the primary target and Ubuntu as the secondary target. The first release is a vertical slice built on a Code OSS fork. It provides an IDE mode, a Cursor-style Agent mode, a dynamically configured embedded LiteLLM gateway, and CI-produced Windows and Ubuntu installers.

The first Agent mode supports conversational chat only. It does not execute terminal commands, modify files, create execution plans, or use external tools.

## Goals

- Build a Windows-first desktop application that is also installable on Ubuntu.
- Preserve the familiar VS Code workbench hierarchy: title bar, activity bar, primary sidebar, editor group, bottom panel, and status bar.
- Make the Agent panel a first-class, Cursor-style AI entry point.
- Use Fluent UI React v9 for new application surfaces instead of implementing basic UI controls manually.
- Route all model traffic through an embedded LiteLLM Proxy.
- Produce `IrisLens-Setup.exe` for Windows x64 and `iris-lens_amd64.deb` for Ubuntu 22.04+.
- Support overwrite installation while retaining user configuration and local data.

## Non-Goals

- No file-editing Agent capability.
- No terminal execution, autonomous planning, multi-agent orchestration, or external tool calling.
- No copying Cursor or VS Code brand assets, icons, artwork, or proprietary source assets.
- No remote synchronization in the first release.

## Architecture

The application consists of four main layers:

1. **Code OSS shell**  
   A Code OSS fork provides the desktop shell, workbench, editor, terminal infrastructure, extension host, and native platform integration.

2. **IrisLens UI layer**  
   A React application built with Fluent UI React v9 is embedded into Code OSS workbench surfaces. It owns the Agent panel, model settings, and application-level mode state.

3. **Local data layer**  
   Local SQLite stores chat sessions and messages. JSON stores application and model configuration. The local data format must support backup and reset.

4. **Embedded LiteLLM gateway**  
   The installer bundles a Python runtime and the pinned LiteLLM library. When the app starts, it launches a LiteLLM Proxy on a random loopback port. The Agent UI sends chat requests to this local proxy, which routes requests to the configured provider endpoint.

### Request flow

```text
Agent Chat UI
  → local UI service
  → embedded LiteLLM Proxy (127.0.0.1, random port)
  → configured LiteLLM Provider endpoint
  → streamed response back through the same path
```

The gateway is the only model entry point. The UI must not call providers directly.

## Layout And Visual Design

The first release uses a Cursor-style AI-first adaptation of the VS Code workbench. The editor remains the center of the IDE, while the Agent panel is a global first-class panel.

### Core layout

| Area | Behavior |
| --- | --- |
| Title bar | Application identity, navigation, workspace name, model selector, and Agent entry. |
| Activity bar | 48px icon rail preserving VS Code activity categories. |
| Primary sidebar | 220–260px Explorer, Search, Source Control, and Extensions views. |
| Editor area | Tabs, syntax highlighting, folding, diagnostics, and editor interactions inherited from Code OSS. |
| Bottom panel | Problems, Output, and Terminal. |
| Agent panel | 340–420px right-side panel with context tags, chat stream, and prompt input. |
| Status bar | Branch, diagnostics, workspace indicators, and LiteLLM gateway state. |

### Visual rules

- Use Fluent UI React v9 tokens, controls, typography, and spacing.
- Support light, dark, and system themes; the default is a modern dark gray theme.
- Use a dense desktop layout with 1px separators, 10px rounded controls where appropriate, and restrained shadows.
- Keep Windows and Ubuntu interaction order identical; platform-specific differences are limited to shell behavior, file paths, and installer integration.
- The product must align with VS Code / Cursor layout and interaction patterns without copying protected visual assets.

### Agent chat UI

- Chat messages render in a scrollable stream with user and assistant roles.
- Selected files and workspace context appear as removable tags above the prompt.
- `Enter` sends a message; `Shift+Enter` inserts a newline.
- Streaming responses render progressively.
- A message can be stopped while streaming.
- The prompt is disabled while the gateway is starting or in an error state.

## Model Configuration

The settings page exposes the following required fields:

- Provider
- Endpoint protocol
- Base URL
- API Key
- Model name

### LiteLLM-aligned configuration discovery

IrisLens must not hard-code a duplicate provider catalog. At startup or settings load, the local adapter reads provider names, endpoint protocols, model fields, required arguments, defaults, and compatibility metadata from the bundled LiteLLM library.

The adapter converts the extracted data into a settings schema, which Fluent UI renders dynamically. The bundled LiteLLM version is pinned to the application release.

The endpoint protocol choices are aligned with LiteLLM and include at least:

- `/chat/completions`
- `/responses`
- `/messages`

Provider naming and routing follow LiteLLM conventions, including providers such as OpenAI, Anthropic, Azure AI, Vertex AI, Bedrock, and Ollama.

If LiteLLM introspection fails because its public structure changed, the settings UI falls back to a bundled schema and shows the current LiteLLM version plus a compatibility warning.

### Connection validation

Before saving a model configuration, IrisLens sends a minimal validation request through the embedded LiteLLM Proxy. The result is shown as one of:

- Model available
- Authentication failed
- Network failed
- Invalid configuration

The user can save only a configuration that completes the validation path successfully.

## Local State

- Chat sessions, messages, timestamps, model metadata, and terminal state are stored in SQLite.
- Unsent prompt text and the most recent active session survive an application restart.
- Configuration is stored locally as JSON.
- The user can reset chat history and application settings from settings.

## Error Handling

The UI must distinguish these gateway states:

- `Starting`
- `Ready`
- `Error`

The status bar displays the current gateway state. When the gateway is not ready, the Agent prompt is disabled and a restart action is available.

Model request errors must distinguish network failure, authentication failure, model unavailability, and invalid configuration. Provider errors should show the HTTP status and a concise LiteLLM-provided reason without exposing internal stack traces in the default UI.

## Packaging And Updates

### Windows

- Target: Windows x64.
- Artifact: `IrisLens-Setup.exe`.
- Installer technology: NSIS.
- Reinstalling or upgrading with a newer build overwrites the previous installation.
- User configuration, SQLite data, and workspace state remain in the user profile and are not removed during overwrite update.

### Ubuntu

- Target: Ubuntu 22.04+ on amd64.
- Artifact: `iris-lens_amd64.deb`.
- DEB package upgrades replace the previous application files.
- User configuration and local data remain in the user profile and are not removed during package upgrade.

### Versioning and release

- The application version and package version use the same semantic version.
- Branch builds upload CI artifacts.
- Tag builds attach both artifacts to the corresponding GitHub Release.

## CI/CD

GitHub Actions runs on pushes and pull requests with the following stages:

1. Install Node.js and Python dependencies from lockfiles.
2. Run TypeScript, Python, lint, and unit checks.
3. Build the patched Code OSS application.
4. Bundle the pinned LiteLLM runtime.
5. Build the Windows NSIS package and Ubuntu DEB package.
6. Run smoke checks for artifact existence, package metadata, and basic application launch.
7. Upload `IrisLens-Setup.exe` and `iris-lens_amd64.deb` as artifacts.
8. On a release tag, publish both artifacts to GitHub Releases.

Windows jobs are the primary release pipeline. Ubuntu jobs validate cross-platform behavior and produce the secondary installer.

## Testing

### Unit tests

- LiteLLM configuration extraction.
- Settings schema conversion and validation.
- Chat state machine and streaming parser.
- Local configuration persistence.

### Integration tests

- Embedded gateway startup and shutdown.
- Model configuration validation.
- Streaming chat request and user-initiated cancellation.
- SQLite session persistence across restarts.

### UI tests

- Agent panel layout and visibility.
- Prompt keyboard behavior.
- Theme switching.
- Windows and Ubuntu breakpoint behavior.

### Packaging tests

- Windows NSIS install and overwrite upgrade.
- Ubuntu DEB install and upgrade.
- User data retention after upgrade.
- Artifact smoke launch on each target platform.

## Success Criteria

The first release is successful when:

- The app builds from a Code OSS fork into installable Windows and Ubuntu packages.
- The workbench matches the agreed VS Code / Cursor-style hierarchy.
- The Agent panel supports streaming chat only.
- The embedded LiteLLM Proxy launches locally and routes all model calls.
- Provider and protocol settings are discovered from the bundled LiteLLM version.
- Branch CI uploads both artifacts.
- Tag CI publishes both artifacts to GitHub Releases.
- Overwrite installation preserves user data on both platforms.
