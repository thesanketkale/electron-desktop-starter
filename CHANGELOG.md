# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-25

### Added

- **Electron Foundation Scaffolding**: Modern, hardened architecture using Electron, TypeScript (strict mode), `electron-vite`, and React.
- **Security Hardening**:
  - Enforced `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, and `webviewTag: false`.
  - Custom privileged `app://` protocol loader replacing unsafe `file://` scheme.
  - Strict Content-Security-Policy (CSP) headers applied across all responses.
  - Automated Electron Fuses configuration flipping RunAsNode, NODE_OPTIONS, Inspect arguments, and enforcing ASAR integrity validation.
  - Navigation guards via `setWindowOpenHandler` and `will-navigate`.
  - Zero-trust permission handler denying all Chromium browser permissions by default.
- **Typed IPC Layer**:
  - Centralized IPC contract in `src/shared/ipc.ts` utilizing Zod runtime schema validation.
  - Origin verification wrapper ensuring invocations stem strictly from authorized frame URLs.
  - Typed preload bridge exposing `window.api` with contextBridge isolation.
- **Local-First SQLite Persistence**:
  - Embedded `better-sqlite3` operating in `userData` with Write-Ahead Logging (WAL) mode.
  - Sequential schema migration runner tracked via `PRAGMA user_version`.
  - Live database snapshot backup export functionality.
- **Schema-Validated Settings & Credentials**:
  - Settings store validated via Zod schemas.
  - Secrets storage integrating Electron `safeStorage` (DPAPI/Keychain/Secret Service) with documented Linux fallback.
- **Structured Logging & Diagnostics**:
  - Rotating structured log files with automated secret redaction filters.
  - One-click sanitized diagnostics bundle exporter.
- **Auto-Update Pipeline**:
  - Support for `latest` and `beta` release channels using `electron-updater`.
  - Offline local mock update server for integration testing.
- **CI/CD & Packaging**:
  - Cross-platform packaging configurations for Windows (NSIS), macOS (DMG/ZIP), and Linux (AppImage).
  - Pluggable code signing supporting Azure Trusted Signing, PFX Authenticode, and macOS notarytool.
  - Multi-OS GitHub Actions workflow matrix with strict SHA pinning and zero top-level permissions.
- **Test Automation**:
  - Unit tests with Vitest covering IPC schemas, database migrations, settings, and logging redaction.
  - End-to-end tests with Playwright for Electron covering launch, CSP, IPC, database, and navigation blocks.
