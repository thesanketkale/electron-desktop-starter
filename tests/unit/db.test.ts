import { describe, it, expect, beforeEach } from 'vitest'
import { applyMigrations } from '../../src/main/db/migrator'
import { NoteRepository } from '../../src/main/db/repository'
import type Database from 'better-sqlite3'

// In-memory mock database conforming to better-sqlite3 Database interface
class MockDatabase {
  public userVersion = 0
  public pragmas: Record<string, string | number> = {
    journal_mode: 'wal',
    synchronous: 'normal',
    foreign_keys: 1,
    user_version: 0
  }
  public tables: {
    notes: Map<
      string,
      { id: string; title: string; content: string; created_at: string; updated_at: string }
    >
    metadata: Map<string, { key: string; value: string; updated_at: string }>
  } = {
    notes: new Map(),
    metadata: new Map()
  }

  public pragma(str: string, options?: { simple?: boolean }): unknown {
    if (str.startsWith('user_version =')) {
      const v = parseInt(str.split('=')[1]!.trim(), 10)
      this.userVersion = v
      this.pragmas.user_version = v
      return v
    }
    if (str === 'user_version') {
      return options?.simple ? this.userVersion : [{ user_version: this.userVersion }]
    }
    const parts = str.split('=')
    if (parts.length === 2) {
      this.pragmas[parts[0]!.trim()] = parts[1]!.trim()
    }
    return this.pragmas[str] ?? null
  }

  public exec(_sql: string): void {
    // Schema creation simulation
  }

  public transaction<T extends (...args: unknown[]) => unknown>(fn: T): T {
    return ((...args: unknown[]) => fn(...args)) as T
  }

  public prepare(sql: string) {
    /* eslint-disable-next-line @typescript-eslint/no-this-alias */
    const db = this
    return {
      all(...params: unknown[]) {
        const notesArr = Array.from(db.tables.notes.values())
        if (sql.includes('WHERE title LIKE ?')) {
          const pattern = (params[0] as string).replace(/%/g, '').toLowerCase()
          return notesArr
            .filter(
              (n) =>
                n.title.toLowerCase().includes(pattern) || n.content.toLowerCase().includes(pattern)
            )
            .map((n) => ({
              id: n.id,
              title: n.title,
              content: n.content,
              createdAt: n.created_at,
              updatedAt: n.updated_at
            }))
        }
        return notesArr.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: n.created_at,
          updatedAt: n.updated_at
        }))
      },
      get(id: string) {
        const note = db.tables.notes.get(id)
        if (!note) return null
        return {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.created_at,
          updatedAt: note.updated_at
        }
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO notes')) {
          const [id, title, content, created_at, updated_at] = params as [
            string,
            string,
            string,
            string,
            string
          ]
          db.tables.notes.set(id, { id, title, content, created_at, updated_at })
          return { changes: 1 }
        }
        if (sql.includes('UPDATE notes')) {
          const [title, content, updated_at, id] = params as [string, string, string, string]
          const existing = db.tables.notes.get(id)
          if (existing) {
            db.tables.notes.set(id, { ...existing, title, content, updated_at })
            return { changes: 1 }
          }
          return { changes: 0 }
        }
        if (sql.includes('DELETE FROM notes')) {
          const [id] = params as [string]
          const deleted = db.tables.notes.delete(id)
          return { changes: deleted ? 1 : 0 }
        }
        return { changes: 0 }
      }
    }
  }

  public async backup(_dest: string): Promise<void> {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(_dest, 'mock-sqlite-db-content', 'utf-8')
  }

  public close(): void {
    this.tables.notes.clear()
    this.tables.metadata.clear()
  }
}

describe('SQLite Database & Migrations Engine', () => {
  let db: MockDatabase
  let repository: NoteRepository

  beforeEach(() => {
    db = new MockDatabase()
    const migrationResult = applyMigrations(db as unknown as Database.Database)
    expect(migrationResult.previousVersion).toBe(0)
    expect(migrationResult.currentVersion).toBe(2)
    expect(migrationResult.appliedCount).toBe(2)

    repository = new NoteRepository(db as unknown as Database.Database)
  })

  it('sets user_version pragma correctly after migrations', () => {
    const version = db.pragma('user_version', { simple: true })
    expect(version).toBe(2)
  })

  it('is idempotent when running migrations again', () => {
    const rerun = applyMigrations(db as unknown as Database.Database)
    expect(rerun.previousVersion).toBe(2)
    expect(rerun.currentVersion).toBe(2)
    expect(rerun.appliedCount).toBe(0)
  })

  it('creates and retrieves a note', () => {
    const created = repository.createNote('First Note', 'Content details')
    expect(created.id).toBeDefined()
    expect(created.title).toBe('First Note')
    expect(created.content).toBe('Content details')

    const retrieved = repository.getNoteById(created.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.title).toBe('First Note')
  })

  it('updates an existing note', () => {
    const created = repository.createNote('Original Title', 'Original Content')
    const updated = repository.updateNote(created.id, 'New Title', 'New Content')

    expect(updated.title).toBe('New Title')
    expect(updated.content).toBe('New Content')
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.createdAt).getTime()
    )
  })

  it('deletes an existing note', () => {
    const created = repository.createNote('To Delete', 'Will be removed')
    const deleted = repository.deleteNote(created.id)
    expect(deleted).toBe(true)

    const retrieved = repository.getNoteById(created.id)
    expect(retrieved).toBeNull()
  })

  it('filters notes by search query', () => {
    repository.createNote('Apples and Oranges', 'Fruit list')
    repository.createNote('Bananas', 'Tropical fruit')
    repository.createNote('Carrots', 'Vegetable')

    const results = repository.getNotes('fruit')
    expect(results.length).toBe(2)
  })

  it('exports a consistent database backup file', async () => {
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { existsSync, unlinkSync } = await import('node:fs')

    repository.createNote('Persisted in backup', 'Snapshot test')
    const backupPath = join(tmpdir(), `test-backup-${Date.now()}.sqlite`)

    const size = await repository.exportBackup(backupPath)
    expect(existsSync(backupPath)).toBe(true)
    expect(size).toBeGreaterThan(0)
    unlinkSync(backupPath)
  })
})
