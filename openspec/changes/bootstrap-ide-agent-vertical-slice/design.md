## Context

The repository currently has no IrisLens desktop implementation. The selected route is a vertical slice based on the brainstorm decisions: a Code OSS fork, Fluent UI React for new product surfaces, an embedded LiteLLM Proxy, and Windows/Ubuntu installers. The first release must balance Cursor-style Agent integration against the long-term maintenance cost of a fork.

## Goals / Non-Goals

**Goals:**

- Establish a fork architecture with explicit IrisLens boundaries so upstream updates remain feasible.
- Deliver one Agent conversation loop end to end: context, streaming response, plan, patch review, and approval-gated command execution.
- Keep model access behind one local LiteLLM gateway and derive configuration capabilities from the bundled LiteLLM version.
- Persist conversations and settings locally without exposing API keys in plaintext.
- Prove the product can be built, tested, packaged, installed, and upgraded on both target platforms.

**Non-Goals:**

- No multi-Agent orchestration, autonomous long-running execution, or unsupervised terminal access.
- No preset provider onboarding gallery, external gateway mode, marketplace, telemetry system, or cloud account service.
- No application self-update mechanism in this slice.
- No guarantee of pixel-for-pixel parity with Cursor or a private reuse of its assets.

## Decisions

### Code OSS fork as the application shell

IrisLens will fork Code OSS and keep product-specific code in identifiable workbench and extension-host modules. The fork preserves editor strength, extension compatibility, native terminal behavior, and the ability to promote the Agent panel beyond a normal extension view. This is preferred to extending official VS Code, which would constrain Agent integration, or wrapping a shell around Code OSS, which would add process and input complexity without avoiding fork maintenance.

The fork will use an upstream-tracking mainline and an IrisLens integration branch. Workbench patches will be minimal and encapsulated, and the fork pipeline will track a pinned upstream release rather than continuously merging all upstream changes.

### Fluent UI React inside the Code OSS workbench

New Agent and settings surfaces will use React with Fluent UI v9. Fluent provides accessible controls and visual alignment with Microsoft desktop products; Code OSS extension views can host a React bundle without converting the entire workbench to React. Existing Code OSS components remain in place so editor, terminal, sidebar, and status-bar behavior stay familiar.

The shared design layer will define spacing, radii, typography, status colors, and theme mappings. Product-specific React views will consume those tokens rather than hard-coding colors.

### Embedded LiteLLM Proxy as the sole model gateway

The desktop application will bundle a locked LiteLLM runtime and launch it as a managed child process bound to `127.0.0.1` on a random available port. The Agent UI will not call providers directly. This centralizes protocol translation, provider routing, retries, error visibility, and secret usage while keeping model traffic local.

The main process will own lifecycle, port selection, logs, restart, and readiness. Gateway logs will redact API keys and generated route secrets. The UI will show `Starting`, `Ready`, or `Error`; when not ready it will disable chat and offer restart.

### Dynamic LiteLLM schema through an adapter

An IrisLens adapter will inspect the public LiteLLM constants and configuration model to build a UI schema for provider, endpoint protocol, base URL, API key, model name, defaults, and validation. It will not patch LiteLLM source. A version-specific bundled schema will remain available if inspection fails, and the UI will disclose that fallback. The package lock will pin the LiteLLM version so discovered behavior and tests remain reproducible.

The first settings experience supports one manually entered route and one default chat model. This is deliberately smaller than a provider gallery and still exercises gateway construction, probing, streaming, and secure storage.

### Agent state and persistence

The extension side will manage conversation state, message states, plan status, context references, and patch lifecycle. SQLite will store conversations and messages; local JSON will store non-secret settings; the OS keychain will store API keys by reference. Unsent input and the active conversation ID will be checkpointed so recovery can occur after restart.

For proposed edits, the Agent will produce workspace changes that enter review rather than write directly. Diffs will be shown per file, and application will occur only after user approval. Proposed terminal commands will also require explicit approval and will display the complete command before execution.

### CI, packaging, and release

GitHub Actions will run Node and Python type checks and unit tests, build the fork, bundle the LiteLLM runtime, create packages, and execute a minimal launch smoke test. Release tags will publish:

- `IrisLens-Setup.exe` for Windows x64 using NSIS.
- `iris-lens_amd64.deb` for Ubuntu 22.04 or newer.

Both installers will use stable identity and upgrade paths, overwriting application files while leaving user data in the platform-specific user-data directory. Branch builds will upload artifacts but not publish GitHub releases.

## Risks / Trade-offs

- [Code OSS upstream drift] → Pin an upstream release, isolate fork changes, and maintain scripted build and smoke checks before each upgrade.
- [LiteLLM internals change between releases] → Use public APIs, lock the LiteLLM version, keep a fallback schema, and add extraction contract tests.
- [Gateway lifecycle conflicts or orphaned processes] → Start and stop through one owner, use port ownership checks, terminate children on exit, and redact logs.
- [Agent edits could damage user work] → Never apply generated changes automatically; use reviewable diffs, atomic workspace edits, and existing source-control behavior.
- [Terminal execution is unsafe] → Require explicit approval, display the full command, and keep execution under VS Code terminal controls without autonomous retries.
- [Cross-platform packaging is unstable] → Build both packages continuously and make the smoke test blocking for release artifacts.
- [Credential leakage through diagnostics] → Keep secrets only in the OS keychain, pass references to the gateway, mask UI values, and test generated configuration/log output.

## Migration Plan

This is the initial application slice, so migration is limited to establishing the fork, local storage schema, and installers. Future releases will treat chat history and non-secret settings as retained user data, migrate their schemas independently, and never rewrite OS keychain entries during upgrade. Rollback is achieved by reinstalling the prior installer or DEB package; user-data directories will remain intact.

## Open Questions

None that block the vertical slice.
