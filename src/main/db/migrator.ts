import type Database from 'better-sqlite3'

export interface MigrationDefinition {
  version: number
  name: string
  sql: string
}

export const EMBEDDED_MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: '001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    version: 2,
    name: '002_add_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS ix_notes_created_at ON notes(created_at DESC);
      CREATE INDEX IF NOT EXISTS ix_notes_title ON notes(title);
    `
  }
]

export interface MigrationResult {
  previousVersion: number
  currentVersion: number
  appliedCount: number
}

/**
 * Apply pending migrations sequentially inside transactions.
 */
export function applyMigrations(
  db: Database.Database,
  migrations = EMBEDDED_MIGRATIONS
): MigrationResult {
  const currentVersionRow = db.pragma('user_version', { simple: true }) as number
  const previousVersion = currentVersionRow ?? 0
  let appliedCount = 0
  let activeVersion = previousVersion

  // Filter migrations newer than current user_version
  const pending = migrations
    .filter((m) => m.version > previousVersion)
    .sort((a, b) => a.version - b.version)

  for (const migration of pending) {
    const runMigration = db.transaction(() => {
      db.exec(migration.sql)
      db.pragma(`user_version = ${migration.version}`)
    })

    runMigration()
    activeVersion = migration.version
    appliedCount++
  }

  return {
    previousVersion,
    currentVersion: activeVersion,
    appliedCount
  }
}
