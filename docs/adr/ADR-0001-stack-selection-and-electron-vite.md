# ADR-0001: Stack Selection and Build Tooling

## Status

Accepted

## Date

2026-10-25

## Context

Electron applications require separate compilation pipelines for three distinct execution contexts:

1. **Main Process**: Node.js environment managing native OS lifecycle, windows, and hardware APIs.
2. **Preload Script**: Isolated script bridged to the renderer that acts as an access controller.
3. **Renderer Process**: Chromium browser environment executing user interface components.

Traditional bundlers like Webpack require convoluted multi-target configurations, slow startup times, and cumbersome TypeScript type checking. Electron Forge provides templates but often defaults to Webpack or older build setups.

## Decision

We select **Electron + TypeScript (strict mode)** bundled with **`electron-vite`** and **React** in the renderer.

### Key Components:

- **`electron-vite`**: Provides three distinct Vite builds (`main`, `preload`, `renderer`) in one unified config (`electron.vite.config.ts`), enabling lightning-fast esbuild compilation, Hot Module Replacement (HMR) for the renderer, and out-of-the-box asset handling.
- **Strict TypeScript**: Configured with project references (`tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`) enforcing `strict: true`, `noImplicitAny: true`, and `exactOptionalPropertyTypes: true`.
- **Renderer Isolation**: React with TypeScript is isolated within `src/renderer/`. It imports only shared contracts from `src/shared/` and accesses the host strictly via `window.api`.

## Consequences

### Positive

- Build times under 2 seconds for cold rebuilds.
- HMR works instantly during renderer development without restarting the Electron main process.
- Strict isolation prevents any Node.js module leakage into renderer bundles.
- Zero boilerplate required for sourcemaps and asset loading across multiple processes.

### Negative / Trade-offs

- `better-sqlite3` is a native C++ module requiring prebuilt binaries matching the Electron Node ABI version. Handled using standard Electron packaging tools.

## Alternatives Considered and Rejected

1. **Electron Forge with Webpack**: Slower compilation, complex configuration files, and weaker HMR developer experience.
2. **Next.js / Nuxt inside Electron**: Server-Side Rendering (SSR) adds unnecessary runtime overhead and server process management for a local desktop client.
3. **Vanilla JavaScript**: Rejected due to lack of type safety across IPC process boundaries.
