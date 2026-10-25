# ADR-0003: SQLite Local-First Storage and Migrations Strategy

## Status

Accepted

## Date

2026-10-25

## Context

Desktop applications require resilient, local-first data persistence. The persistence layer must support:

1. Fast transactional performance without networking overhead.
2. Safe schema evolution over time as user software updates.
3. Easy database backup and user data export.
4. Concurrency safety between renderer reads and main process background writes.

## Decision

We select **`better-sqlite3`** running exclusively within the **Main Process** with **Write-Ahead Logging (WAL)** and **`PRAGMA user_version` migrations**:

1. **Storage Location**: The database file `foundation.db` resides in Electron's standard user data directory (`app.getPath('userData')`).
2. **Pragmas**:
   - `PRAGMA journal_mode = WAL;` (Enables concurrent readers and writers without blocking).
   - `PRAGMA synchronous = NORMAL;` (Maintains durability while maximizing SSD write throughput).
   - `PRAGMA foreign_keys = ON;` (Enforces referential integrity).
3. **Migration Engine (`src/main/db/migrator.ts`)**:
   - Numbered migration files (`001_initial.sql`, `002_add_indexes.sql`) stored in `src/main/db/migrations/`.
   - On startup, the migrator checks `PRAGMA user_version`.
   - Unapplied migrations run sequentially inside an explicit database transaction (`BEGIN TRANSACTION ... COMMIT`).
   - `PRAGMA user_version` is updated upon successful commit.
4. **Repository Isolation**: The renderer process has no direct file or SQLite access. All database queries execute via typed IPC handlers in the main process.
5. **Backup Support**: Uses SQLite's online backup API (`db.backup(destinationPath)`) to create live, consistent database snapshots without stopping operations.

## Consequences

### Positive

- Synchronous API in Node.js prevents async race conditions during database transactions.
- Zero external database daemon or setup required.
- WAL mode delivers orders of magnitude faster writes.
- Upgrades are deterministic and rollback on failure without corrupting data.

### Negative / Trade-offs

- Native module requires compilation against Electron Node ABI.
- Complex ORM features (e.g. Prisma or TypeORM query builders) are avoided in favor of clean prepared statements and repositories.

## Alternatives Considered and Rejected

1. **Prisma / TypeORM**: Heavy bundle size, slow initialization, and high friction in Electron packaged environments.
2. **IndexedDB in Renderer**: Suffers from storage quota limits, browser engine clearing, and lack of true native file control.
3. **Plain JSON File Storage**: Does not support ACID transactions, indexing, or safe concurrent writes.
