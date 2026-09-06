## Purpose

Provides a secure, embedded LiteLLM gateway that is the sole model path for Agent conversations and exposes discoverable configuration, probing, streaming, and recovery behavior.

## ADDED Requirements

### Requirement: Embedded Gateway Lifecycle
The system SHALL start an embedded LiteLLM Proxy on a localhost-only random port when the desktop application requires model access and SHALL expose gateway state as Starting, Ready, or Error.

#### Scenario: Gateway becomes ready
- **WHEN** the embedded gateway finishes initialization
- **THEN** the status bar reports Ready and Agent requests can be sent

#### Scenario: Gateway is unavailable
- **WHEN** the gateway cannot start or loses readiness
- **THEN** the status bar reports the failure state and chat input is disabled until recovery or restart succeeds

#### Scenario: Restart gateway
- **WHEN** the user invokes restart gateway from the status bar
- **THEN** a new localhost-only gateway instance is started and the state is refreshed

### Requirement: Single Model Path
The system SHALL route all Agent model calls through the configured LiteLLM gateway rather than calling providers directly from the Agent UI.

#### Scenario: Agent sends a model request
- **WHEN** the user submits a conversation message
- **THEN** the request passes through the local gateway to the configured provider endpoint

#### Scenario: Gateway is disabled
- **WHEN** the embedded gateway is not ready
- **THEN** no Agent model request is sent

### Requirement: Secure Model Configuration
The system SHALL store API keys in the operating-system credential store and SHALL persist only credential references, non-secret settings, and model route definitions locally.

#### Scenario: Save an API key
- **WHEN** the user saves provider credentials
- **THEN** the API key is stored in the OS keychain and does not appear in local settings, logs, or generated route output as plaintext

#### Scenario: Inspect stored configuration
- **WHEN** the user views model settings
- **THEN** the API key is masked and secret values are not exposed in exported diagnostics

### Requirement: Dynamic Configuration Schema
The system SHALL derive provider names, endpoint protocols, required fields, defaults, and compatibility constraints from the bundled LiteLLM version through a separate IrisLens adapter, and SHALL fall back to a bundled schema when extraction fails.

#### Scenario: Render dynamic settings
- **WHEN** the settings page opens and LiteLLM metadata extraction succeeds
- **THEN** provider and endpoint fields, validation constraints, and defaults match the bundled LiteLLM version

#### Scenario: Discovery failure fallback
- **WHEN** LiteLLM metadata extraction fails
- **THEN** the UI loads the bundled schema, shows the bundled LiteLLM version and a discovery-failure notice, and remains usable

### Requirement: First Model Route
The system SHALL let the user configure one model route with base URL, API key, provider, endpoint protocol, and model name, and set one route as the default chat model.

#### Scenario: Create and select default route
- **WHEN** the user saves a valid model route and marks it as default
- **THEN** the title area and Agent requests use that model until the user changes the selection

### Requirement: Connection Probing
The system SHALL validate a saved model configuration with a minimal provider request and distinguish model available, authentication failure, network failure, and configuration errors.

#### Scenario: Successful probe
- **WHEN** the user tests a valid model route
- **THEN** the UI reports that the model is available

#### Scenario: Failed probe categories
- **WHEN** a probe fails
- **THEN** the UI reports whether the failure is authentication, network, unavailable model, or configuration error with provider status and a concise summary when available

### Requirement: Streaming and Interruption
The system SHALL support streaming model responses to the Agent UI and SHALL terminate the active stream when the user stops generation.

#### Scenario: Interrupted response
- **WHEN** the user stops a streaming response
- **THEN** the gateway request is cancelled, received text remains visible, and the message state becomes stopped
