## Purpose

Provides the first-version Agent workflow: context-aware streaming conversations, task planning, reviewable code changes, approval-gated terminal commands, and recoverable local history.

## ADDED Requirements

### Requirement: Workspace Context Capture
The system SHALL allow the user to attach workspace context from the active file, selected code, workspace search results, and explicit user-provided references before sending an Agent request.

#### Scenario: Send selected code as context
- **WHEN** the user selects code and adds it to the Agent prompt
- **THEN** the request includes the selected file path and code selection

#### Scenario: Context remains visible
- **WHEN** the Agent message is submitted
- **THEN** the conversation displays the attached context in collapsible references

### Requirement: Streaming Conversation Control
The system SHALL stream Agent responses progressively, allow the user to stop an in-progress response, and clearly distinguish generating, stopped, failed, and retryable message states.

#### Scenario: Progressive response
- **WHEN** the model returns a streamed response
- **THEN** the Agent panel renders tokens incrementally

#### Scenario: Stop generation
- **WHEN** the user clicks stop while a response is generating
- **THEN** generation ends and the message is marked as stopped while retaining received content

### Requirement: Task Planning
The system SHALL represent a complex Agent request as ordered task steps with visible progress and current state.

#### Scenario: Plan rendered for complex request
- **WHEN** the Agent responds with a multi-step plan
- **THEN** the workbench displays the ordered steps and identifies the active step

#### Scenario: Plan progress updates
- **WHEN** a task step completes
- **THEN** its status changes without erasing the completed history

### Requirement: Reviewable Code Changes
The system SHALL render proposed workspace edits as reviewable diffs and require explicit user approval before applying them.

#### Scenario: Review proposed patch
- **WHEN** the Agent proposes file changes
- **THEN** the user sees per-file before-and-after diffs

#### Scenario: Apply or reject a patch
- **WHEN** the user approves or rejects the proposed change
- **THEN** only approved edits are written and the conversation records the resulting action

### Requirement: Approval-Gated Terminal Commands
The system SHALL require explicit user approval before running any terminal command proposed by the Agent and SHALL display the full command before execution.

#### Scenario: Confirm terminal command
- **WHEN** the Agent proposes a build, test, or diagnostic command
- **THEN** the user can approve or reject it before execution

#### Scenario: Rejected command is not run
- **WHEN** the user rejects the proposed command
- **THEN** no process starts and the conversation records the rejection

### Requirement: Local Conversation History
The system SHALL persist conversations locally, allow the user to start a new conversation or reopen a prior conversation, and preserve recent conversations and unsent input after an application restart.

#### Scenario: Reopen prior conversation
- **WHEN** the user selects a saved conversation from history
- **THEN** its messages, states, and visible references are restored

#### Scenario: Recover unsent input
- **WHEN** IrisLens exits while an Agent prompt is unsent
- **THEN** the input is restored after the next launch
