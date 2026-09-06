## Why

IrisLens needs a first usable desktop product rather than isolated prototypes: users must be able to open a VS Code-like IDE, use a first-class AI Agent, configure and run models through a secure local gateway, and install the result on Windows and Ubuntu. A vertical slice reduces integration risk by proving the fork, UI, gateway, chat workflow, and packaging pipeline together.

## What Changes

- Introduce an IrisLens desktop shell based on a Code OSS fork while preserving the familiar activity bar, editor groups, sidebar, terminal, and status bar.
- Add a Cursor-style Agent panel and local Agent workbench with workspace context, streaming chat, task plans, reviewable code changes, and confirmation-gated terminal commands.
- Add an embedded LiteLLM Proxy gateway as the sole model entry point, including dynamic configuration discovery, connection testing, secure credential storage, streaming responses, interruption, and lifecycle status.
- Add local SQLite-backed chat history and crash-resilient input/session recovery.
- Add a Fluent UI–based settings experience for one manually configured model route in the first release.
- Add CI and packaging that produce a Windows x64 NSIS installer and an Ubuntu 22.04+ DEB package while preserving user data during upgrades.
- Exclude a multi-Agent workbench, fully autonomous execution tools, preset provider onboarding flows, and an in-app auto-update system from this slice.

## Capabilities

### New Capabilities

- `ide-shell`: The Code OSS-based desktop application, dual IDE/Agent layout, visual language, and baseline integration surfaces.
- `agent-workbench`: Streaming conversations, workspace context, task planning, code-change review, terminal approval, and local history.
- `model-gateway`: Embedded LiteLLM lifecycle, dynamic model configuration schema, credential handling, model probing, streaming, interruption, and failure states.
- `release-pipeline`: Type checks, tests, smoke testing, dual-platform packaging, upgrade behavior, and user-data retention.

### Modified Capabilities

- None.

## Impact

- **Application**: Code OSS fork sources, main process lifecycle management, workbench/renderer integration, extension host code, and local persistence.
- **Agent UI**: A new React-based Agent panel, settings page, status indicators, context pickers, task views, diffs, and chat input/output components.
- **Model runtime**: A bundled Python/LiteLLM runtime, generated local router configuration, localhost random-port gateway, credential references, and public API calls from the Agent UI.
- **Packaging and CI**: GitHub Actions workflows, dependency locks, installer definitions, upgrade scripts, smoke tests, and release artifact publishing.
- **Security and privacy**: OS keychain use for API keys, no plaintext key persistence, localhost-only gateway binding, explicit terminal command confirmation, and no transmission of workspace context beyond the selected model provider.
