# Contributing to Electron Foundation

Thank you for your interest in contributing to **Electron Foundation**! This repository provides a hardened, security-first desktop foundation for building cross-platform apps with Electron, TypeScript, and SQLite.

## Code of Conduct

All contributors are expected to uphold the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher
- Git

### Quickstart

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/thesanketkale/electron-foundation.git
   cd electron-foundation
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application in development mode with Hot Module Replacement (HMR):
   ```bash
   npm run dev
   ```

## Verification Scripts

Before submitting a Pull Request, run the local verification harness:

```bash
# Fast verification (< 30s: linting, formatting, TypeScript typecheck, guard audit)
./scripts/verify.ps1 fast # Windows PowerShell
bash scripts/verify.sh fast # Unix / Git Bash

# Full verification (unit tests, build, packaging, fuse verification)
./scripts/verify.ps1 full
bash scripts/verify.sh full
```

## Pull Request Guidelines

1. **Clean-Room Rule**: All contributions must be original work. Never submit proprietary code, assets, or credentials from third-party or client projects.
2. **Strict Security Model**:
   - Never disable `contextIsolation`, `sandbox`, or `webSecurity`.
   - All IPC channels must be documented in `src/shared/ipc.ts` with Zod schema validation for request and response payloads.
   - Any external links must be validated and opened exclusively via `shell.openExternal`.
3. **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`).
4. **Action Pinning**: Any third-party GitHub Action added to `.github/workflows/` must be pinned to a full 40-character commit SHA with a trailing version comment.
