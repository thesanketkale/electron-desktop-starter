# ADR-0004: Pluggable Code Signing and Automated Release Pipeline

## Status

Accepted

## Date

2026-10-25

## Context

Code signing and notarization are necessary for operating systems (Windows SmartScreen, macOS Gatekeeper) to trust desktop software without scary security warnings. However:

1. Open-source developers and contributors frequently lack access to expensive code-signing hardware tokens, EV certificates, or Apple Developer subscriptions.
2. Hardcoding strict signing requirements breaks standard Pull Request CI workflows on public forks.
3. Windows signing is undergoing a transition from traditional hardware tokens / PFX files to cloud-based Microsoft Azure Trusted Signing.

## Decision

We implement a **Pluggable, Gracefully-Degrading Signing Architecture** in `electron-builder.yml` and GitHub Actions:

1. **Unsigned CI Default**:
   - In PR checks or environments without signing credentials, `electron-builder` builds unsigned packages (Windows NSIS, macOS DMG/ZIP, Linux AppImage).
   - CI records an informational note in the GitHub Actions job summary stating: _"Artifacts built unsigned due to absent code-signing secrets"_.
   - CI build never fails simply because signing certificates are absent.
2. **Pluggable Windows Signing**:
   - Supports **Azure Trusted Signing** (recommended modern standard) via `azureSignOptions` when `AZURE_KEY_VAULT_URI`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` are provided.
   - Alternatively supports traditional **PFX / Authenticode** via standard `CSC_LINK` and `CSC_KEY_PASSWORD`.
3. **macOS Developer ID & Notarization**:
   - Hardened runtime enabled (`hardenedRuntime: true`) with explicit entitlements in `build/entitlements.mac.plist`.
   - Apple notarization configured via `notarytool` utilizing App Store Connect API keys (`APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`).
4. **Automated Release Workflow (`.github/workflows/release.yml`)**:
   - Triggered on tag pushes (`v*`).
   - Builds artifacts across Windows, macOS, and Linux runners.
   - Generates SHA-256 checksums file (`SHA256SUMS.txt`).
   - Generates update manifest files (`latest.yml`, `latest-mac.yml`).
   - Generates GitHub build provenance attestation (`actions/attest-build-provenance`).

## Consequences

### Positive

- Public pull requests and contributor builds pass without requiring access to private signing keys.
- Production release tags produce signed, notarized, and verifiable desktop releases automatically.
- Future-proof support for modern Azure Trusted Signing alongside legacy PFX setups.

### Negative / Trade-offs

- Users testing unsigned builds downloaded from pull requests must bypass Windows SmartScreen ("More info -> Run anyway") and macOS Gatekeeper. Clear user instructions are provided in `docs/release-and-signing.md`.

## Alternatives Considered and Rejected

1. **Failing CI when certificates are missing**: Blocks community contributions and breaks local verification workflows.
2. **Bundling self-signed certificates in repository**: Insecure and flagged as malicious by modern OS scanners.
