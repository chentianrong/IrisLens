## 1. Repository and Shell Foundation

- [ ] 1.1 Pin an upstream Code OSS release and create the fork build workspace with documented upstream, build, and IrisLens integration branches; verify a clean local build succeeds.
- [x] 1.2 Define the IrisLens repository layout for fork patches, extension UI, gateway runtime, persistence, tests, CI, and packaging; verify all declared paths and package manifests exist.
- [ ] 1.3 Add product identity, application entry point, and desktop launch metadata for Windows and Ubuntu; verify IrisLens launches to a usable Code OSS workspace on at least one development platform.
- [x] 1.4 Add the shared Fluent-style theme token layer and light, dark, and system-following mappings; verify automated token snapshot/unit tests and manual theme switching.
- [ ] 1.5 Preserve standard editor, sidebar, terminal, status-bar, and extension behavior while adding IrisLens-only modules; verify extension loading and baseline editor tests run successfully.

## 2. Agent Panel and Workbench

- [x] 2.1 Add a first-class resizable Agent panel to the workbench with open, close, collapse, and desktop-width behavior; verify UI component tests and manual layout checks.
- [x] 2.2 Implement chat input, streaming message rendering, generation state, stop control, failure display, and retry affordance; verify unit and integration tests with a deterministic streaming gateway stub.
- [x] 2.3 Implement context capture for active file, selected code, workspace search, and explicit references with visible collapsible context tags; verify the outgoing request payload and UI tests.
- [x] 2.4 Implement ordered task-plan display and lifecycle states for complex Agent requests; verify message-processing unit tests and a scripted multi-step conversation.
- [x] 2.5 Implement Agent-proposed file edits as per-file review diffs with apply/reject actions and conversation audit entries; verify no writes occur before approval and that approved edits are atomic.
- [ ] 2.6 Implement full-command terminal approval UI and execution through the IDE terminal; verify proposed commands cannot run until approved and rejected commands are recorded.

## 3. Model Gateway and Settings

- [x] 3.1 Add the locked Python/LiteLLM runtime and gateway process manager with localhost random-port selection, child-process cleanup, readiness, and restart; verify lifecycle integration tests and no plaintext secrets in logs.
- [x] 3.2 Implement the version-specific LiteLLM schema adapter with provider, endpoint protocol, required fields, defaults, compatibility data, and bundled fallback schema; verify extraction unit tests and explicit fallback notice.
- [x] 3.3 Implement one-route model settings with base URL, provider, endpoint protocol, API key, model name, default-chat selection, and validation; verify schema-driven rendering and request construction.
- [x] 3.4 Add OS keychain storage, local secret references, masked settings UI, and redacted diagnostics; verify plaintext secret storage and log/export tests fail if exposure is introduced.
- [x] 3.5 Implement minimal model probing with available, authentication, network, unavailable-model, and configuration results; verify each category against stubbed provider responses.
- [x] 3.6 Implement the local gateway request path for streaming and cancellation; verify streamed tokens render incrementally and stop terminates the gateway request.

## 4. Local Persistence and Recovery

- [x] 4.1 Add SQLite migrations for conversations, messages, states, context references, plans, patch decisions, and terminal decisions; verify migration and rollback tests.
- [x] 4.2 Implement conversation save, history list, reopening, and active conversation selection; verify persisted conversation content is restored exactly.
- [x] 4.3 Checkpoint unsent Agent input and active conversation ID; verify input and selection recover after application restart.
- [x] 4.4 Add non-secret settings persistence and user-data directory placement for Windows and Ubuntu; verify settings and history survive a simulated upgrade.

## 5. Integration Testing and Product Polish

- [x] 5.1 Add an end-to-end fixture that exercises configured route, gateway readiness, streaming conversation, context attachment, and stop behavior; verify the full flow.
- [x] 5.2 Add end-to-end tests for code-diff approval/rejection and approved terminal execution; verify workspace state and history after each action.
- [x] 5.3 Add Agent layout, theme, keyboard, and breakpoint coverage for Windows and Ubuntu desktop dimensions; verify automated UI tests pass.
- [x] 5.4 Add gateway error-state and recovery coverage for startup failure, runtime failure, restart, disabled chat, and provider errors; verify status transitions are deterministic.
- [x] 5.5 Perform accessibility, performance, and startup-time passes for the Agent panel and settings; verify no regression below agreed desktop thresholds.

## 6. CI and Release

- [x] 6.1 Add CI workflows for type checking, Node and Python unit tests, gateway integration tests, UI tests, and build caching; verify all checks run on push and pull request.
- [x] 6.2 Add a minimal packaged-launch smoke test that reaches the IDE shell and reports gateway readiness or a clear failure; verify it is blocking for release builds.
- [ ] 6.3 Add Windows x64 NSIS packaging with application registration, uninstall behavior, and stable user-data location; verify installation and launch on Windows.
- [x] 6.4 Add Ubuntu 22.04+ DEB packaging with desktop integration, uninstall behavior, and stable user-data location; verify installation and launch on Ubuntu.
- [ ] 6.5 Add same-platform upgrade validation for Windows and Ubuntu that retains settings, workspace state, and chat history; verify both upgrade scenarios on CI or targeted runners.
- [x] 6.6 Configure tagged builds to publish both installers to GitHub Releases and branch builds to upload artifacts only; verify release and branch behaviors.
- [ ] 6.7 Run the complete CI pipeline and produce both final artifacts; verify all required checks, smoke tests, and validations pass.
