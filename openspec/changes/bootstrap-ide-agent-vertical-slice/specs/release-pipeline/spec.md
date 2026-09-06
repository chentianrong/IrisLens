## Purpose

Provides repeatable verification and dual-platform distribution for the IrisLens vertical slice while protecting user data during upgrades.

## ADDED Requirements

### Requirement: Continuous Verification
The CI pipeline SHALL run type checking, unit tests, integration checks where applicable, packaging, and a minimal application smoke test for every push or pull request.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated
- **THEN** CI runs type checks, unit tests, packaging, and the smoke suite before merge

### Requirement: Dual-Platform Installers
The CI pipeline SHALL produce a Windows x64 NSIS installer and an Ubuntu 22.04+ AMD64 DEB package for release builds.

#### Scenario: Build release artifacts
- **WHEN** a release tag is built
- **THEN** CI publishes both the Windows installer and Ubuntu DEB package as release artifacts

#### Scenario: Branch build artifact
- **WHEN** a non-release branch build succeeds
- **THEN** installable artifacts are uploaded for testing but no GitHub release is published

### Requirement: Upgrade and User-Data Retention
The system SHALL support same-platform upgrades by installing over the prior version and SHALL retain user settings, workspace state, and chat history.

#### Scenario: Windows upgrade
- **WHEN** the user runs a newer Windows installer over an existing installation
- **THEN** application files update while prior user settings and chat history remain available

#### Scenario: Ubuntu upgrade
- **WHEN** the user upgrades the DEB package to a newer version
- **THEN** user settings and chat history remain available after restart

### Requirement: Packaging Smoke Coverage
The release pipeline SHALL verify that each packaged application launches, reaches the IDE shell, and reports gateway readiness or a clear gateway failure without leaking credentials.

#### Scenario: Packaged application smoke test
- **WHEN** CI completes packaging
- **THEN** the packaged application launches to the IDE shell and produces a deterministic gateway readiness or failure result
