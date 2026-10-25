import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { NoteRecord } from '../../shared/types'

export class NoteRepository {
  constructor(private readonly db: Database.Database) {}

  public getNotes(query?: string, limit = 50, offset = 0): NoteRecord[] {
    if (query && query.trim().length > 0) {
      const stmt = this.db.prepare<[string, string, number, number], NoteRecord>(`
        SELECT 
          id, 
          title, 
          content, 
          created_at AS createdAt, 
          updated_at AS updatedAt
        FROM notes
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      const searchPattern = `%${query.trim()}%`
      return stmt.all(searchPattern, searchPattern, limit, offset)
    }

    const stmt = this.db.prepare<[number, number], NoteRecord>(`
      SELECT 
        id, 
        title, 
        content, 
        created_at AS createdAt, 
        updated_at AS updatedAt
      FROM notes
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset)
  }

  public getNoteById(id: string): NoteRecord | null {
    const stmt = this.db.prepare<[string], NoteRecord>(`
      SELECT 
        id, 
        title, 
        content, 
        created_at AS createdAt, 
        updated_at AS updatedAt
      FROM notes
      WHERE id = ?
    `)
    const result = stmt.get(id)
    return result ?? null
  }

  public createNote(title: string, content = ''): NoteRecord {
    const id = randomUUID()
    const now = new Date().toISOString()

    const stmt = this.db.prepare<[string, string, string, string, string]>(`
      INSERT INTO notes (id, title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    stmt.run(id, title.trim(), content, now, now)

    return {
      id,
      title: title.trim(),
      content,
      createdAt: now,
      updatedAt: now
    }
  }

  public updateNote(id: string, title: string, content: string): NoteRecord {
    const existing = this.getNoteById(id)
    if (!existing) {
      throw new Error(`Note with id '${id}' not found`)
    }

    const now = new Date().toISOString()
    const stmt = this.db.prepare<[string, string, string, string]>(`
      UPDATE notes
      SET title = ?, content = ?, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(title.trim(), content, now, id)

    return {
      id,
      title: title.trim(),
      content,
      createdAt: existing.createdAt,
      updatedAt: now
    }
  }

  public deleteNote(id: string): boolean {
    const stmt = this.db.prepare<[string]>(`
      DELETE FROM notes
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }

  public async exportBackup(destinationPath: string): Promise<number> {
    await this.db.backup(destinationPath)
    const { statSync } = await import('node:fs')
    return statSync(destinationPath).size
  }
}
