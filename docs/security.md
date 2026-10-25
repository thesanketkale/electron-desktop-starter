# Security Model & Electron Security Checklist Audit

This document audits `electron-foundation` against the official [Electron Security Recommendations Checklist](https://www.electronjs.org/docs/latest/tutorial/security).

## Security Checklist Compliance Matrix

| #   | Electron Security Recommendation                     | Foundation Implementation                                                                     | Status                      |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Only load secure content                             | Privileged custom `app://` protocol loaded in production; HTTPS allowlist for external links. | :white_check_mark: Enforced |
| 2   | Do not enable Node.js integration for remote content | `nodeIntegration: false` explicitly configured on all windows.                                | :white_check_mark: Enforced |
| 3   | Enable context isolation                             | `contextIsolation: true` explicitly configured on all windows.                                | :white_check_mark: Enforced |
| 4   | Enable the Chromium sandbox                          | `sandbox: true` enforced on all WebContents.                                                  | :white_check_mark: Enforced |
| 5   | Define a Content-Security-Policy (CSP)               | Strict CSP set via HTTP response headers on session webRequest.                               | :white_check_mark: Enforced |
| 6   | Do not use `allowRunningInsecureContent`             | `allowRunningInsecureContent: false` set explicitly.                                          | :white_check_mark: Enforced |
| 7   | Do not enable experimental features                  | Disabled by default.                                                                          | :white_check_mark: Enforced |
| 8   | Do not use `enableBlinkFeatures`                     | Disabled by default.                                                                          | :white_check_mark: Enforced |
| 9   | Do not use `<webview>` tags                          | `webviewTag: false` enforced.                                                                 | :white_check_mark: Enforced |
| 10  | Do not navigate untrusted content                    | `will-navigate` blocks unexpected navigations.                                                | :white_check_mark: Enforced |
| 11  | Do not allow untrusted new windows                   | `setWindowOpenHandler` denies all popups; allowlisted HTTPS opens in system browser.          | :white_check_mark: Enforced |
| 12  | Handle permission requests                           | `setPermissionRequestHandler` denies all permissions by default.                              | :white_check_mark: Enforced |
| 13  | Secure IPC communication                             | Typed Zod schemas + sender frame origin verification on every channel.                        | :white_check_mark: Enforced |
| 14  | Flip Electron security fuses                         | 5 security fuses flipped during packaging and verified via automated test script.             | :white_check_mark: Enforced |

---

## Detailed Hardening Guarantees

### 1. Context Isolation & Sandboxing

The main window is initialized with zero Node.js capabilities in the renderer:

```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webviewTag: false,
  webSecurity: true,
  allowRunningInsecureContent: false
}
```

Preload scripts execute within a dedicated, unprivileged V8 context. Even if an attacker achieves arbitrary JavaScript execution in the renderer DOM, they cannot modify preload prototypes or hijack internal Node APIs.

### 2. Privileged Custom Protocol (`app://`)

Rather than relying on `file://` (which grants broad read access to the local disk and creates origin ambiguities), `electron-foundation` serves the frontend using a custom `app://` scheme:

- Registered via `protocol.registerSchemesAsPrivileged` with standard, secure, and fetch privileges.
- Prevents path traversal via strict URI path normalization (`normalize(pathname)`).

### 3. Strict Content-Security-Policy (CSP)

The CSP is injected directly into HTTP response headers on every request via Electron's `webRequest` API:

```http
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'none';
form-action 'none';
```

- Disallows `eval()` and inline scripts.
- Prevents loading assets, styles, or fonts from external domains or CDNs.

### 4. Zero-Trust IPC Architecture

All IPC handlers go through `registerIpcHandler`:

1. **Origin Verification**: Checks that `event.senderFrame.url` originates from `app://-` (or localhost during dev). Invocations from unknown frames or injected iframes are rejected.
2. **Runtime Schema Validation**: Incoming payloads are validated against Zod schemas. Invalid payloads are rejected before business logic is invoked.
3. **Structured Errors**: Returns RFC 9457-inspired error envelopes `{ success: false, error: { code, message, details } }`.

### 5. Electron Fuses Configuration

Electron binaries contain configurable compile-time "fuses" that can be flipped post-packaging to permanently disable risky debugging capabilities:

| Fuse                                    | Configured State | Security Rationale                                                                                        |
| --------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `RunAsNode`                             | **Disabled (0)** | Prevents attackers from using the app binary as a generic Node.js interpreter (`ELECTRON_RUN_AS_NODE=1`). |
| `EnableCookieEncryption`                | **Enabled (1)**  | Enforces cookie encryption on disk using platform credentials.                                            |
| `EnableNodeOptionsEnvironmentVariable`  | **Disabled (0)** | Prevents code injection via the `NODE_OPTIONS` environment variable.                                      |
| `EnableNodeCliInspectArguments`         | **Disabled (0)** | Blocks unauthorized remote debugging via `--inspect` and `--inspect-brk`.                                 |
| `EnableEmbeddedAsarIntegrityValidation` | **Enabled (1)**  | Validates header checksums of the ASAR archive against the executable signature.                          |
| `OnlyLoadAppFromAsar`                   | **Enabled (1)**  | Disallows loading unbundled application code from raw directories.                                        |

Fuses are automatically applied by `npm run package` and asserted in CI using `npm run fuses:verify`.

### 6. Secrets & API Keys

Secrets are encrypted using Electron's `safeStorage` API:

- Windows: Uses Windows DPAPI (tied to user logon account).
- macOS: Uses macOS Keychain Services.
- Linux: Uses Secret Service API (libsecret).
- Headless Fallback: If `safeStorage.isEncryptionAvailable()` returns false, credentials use local machine-salted AES-256-GCM with a logged warning.
