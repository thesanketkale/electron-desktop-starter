import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import Database from 'better-sqlite3'
import { applyMigrations, type MigrationResult } from './migrator'
import { NoteRepository } from './repository'

export interface DatabaseContext {
  db: Database.Database
  repository: NoteRepository
  migrationResult: MigrationResult
  dbPath: string
}

let activeContext: DatabaseContext | null = null

export function initDatabase(
  storageDirectory: string,
  filename = 'foundation.db'
): DatabaseContext {
  if (activeContext) {
    return activeContext
  }

  mkdirSync(storageDirectory, { recursive: true })
  const dbPath = join(storageDirectory, filename)

  const db = new Database(dbPath)

  // Configure high-performance, resilient pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  // Run pending schema migrations
  const migrationResult = applyMigrations(db)

  const repository = new NoteRepository(db)

  activeContext = {
    db,
    repository,
    migrationResult,
    dbPath
  }

  return activeContext
}

export function getDatabaseContext(): DatabaseContext {
  if (!activeContext) {
    throw new Error('Database context has not been initialized yet')
  }
  return activeContext
}

export function closeDatabase(): void {
  if (activeContext) {
    activeContext.db.close()
    activeContext = null
  }
}
