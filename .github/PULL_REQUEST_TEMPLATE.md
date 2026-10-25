## Description

<!-- Provide a clear description of your changes, context, and motivation. -->

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Security hardening or dependency update
- [ ] Documentation update

## Verification & Testing

<!-- Describe the tests executed to verify these changes. -->

- [ ] `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify.ps1 full` passes locally.
- [ ] `tools/guard.ps1` (or `tools/guard.sh`) passes with zero violations.
- [ ] Playwright E2E tests pass (`npm run test:e2e`).
- [ ] Electron fuses verification succeeds (`npm run fuses:verify`).

## Security Checklist

- [ ] Context isolation, sandbox, and webSecurity remain enabled.
- [ ] No unvalidated IPC channels or eval/remote code execution introduced.
- [ ] All third-party GitHub Actions pinned to 40-character commit SHAs.
- [ ] No client names, credentials, or private keys included.
