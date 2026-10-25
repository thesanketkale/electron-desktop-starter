# ADR-0002: IPC Security, Origin Verification, and Zod Contracts

## Status

Accepted

## Date

2026-10-25

## Context

Inter-Process Communication (IPC) is the primary attack vector in Electron applications. Common vulnerabilities include:

1. Allowing the renderer to pass unvalidated arguments into powerful main process functions (e.g. file paths, shell commands, SQL queries).
2. Allowing compromised third-party frames or rogue windows to send IPC messages to main handlers.
3. Exposing raw `ipcRenderer.send` or `ipcRenderer.invoke` directly to `window`.

## Decision

We enforce a **Zero-Trust Typed IPC Architecture**:

1. **Single Source of Truth (`src/shared/ipc.ts`)**: All IPC channel names are defined as constants. Every channel has paired Zod schemas for request payloads and response payloads.
2. **Safe Handler Wrapper (`src/main/ipc/register.ts`)**: All `ipcMain.handle` invocations go through a typed registration wrapper function:
   - **Sender Frame Verification**: Asserts that `event.senderFrame` exists and originates from the authorized `app://-` origin (or `http://localhost:*` during development).
   - **Runtime Schema Validation**: The incoming payload is parsed via `requestSchema.safeParse()`. If validation fails, execution immediately halts and returns a structured error object.
   - **Response Envelope**: Handlers return a standardized `{ success: true, data: T }` or `{ success: false, error: { code: string, message: string, details?: unknown } }` format inspired by RFC 9457 Problem Details.
3. **Preload Access Controller (`src/preload/index.ts`)**: Only a strongly-typed `window.api` object is exposed via `contextBridge.exposeInMainWorld`. Raw `ipcRenderer` is never leaked to the global scope.

## Consequences

### Positive

- Both compile-time TypeScript safety and runtime payload integrity are guaranteed.
- Malformed or malicious IPC messages are rejected before reaching business logic or database queries.
- Preload provides an immutable, explicit API boundary.

### Negative / Trade-offs

- Slight runtime overhead for Zod parsing (negligible for desktop IPC payloads, typically <0.1ms).
- Adding a new IPC channel requires updating `src/shared/ipc.ts`, the handler in `src/main`, and `src/preload/index.ts`. (Documented step-by-step in `docs/adding-a-feature.md`).

## Alternatives Considered and Rejected

- **Raw `ipcMain.on` / `ipcRenderer.send` without schemas**: High risk of injection and serialization bugs.
- **tRPC over Electron**: Adds unnecessary architectural abstraction when Zod contracts + contextBridge wrappers provide native end-to-end type safety with zero external runtime server.
