import { useEffect, useState } from 'react'
import type { NoteRecord } from '@shared/types'

export function DatabaseView(): React.JSX.Element {
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  const loadNotes = async (searchTerm = search): Promise<void> => {
    setLoading(true)
    try {
      const data = await window.api.db.getNotes({ query: searchTerm })
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotes('')
  }, [])

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) return

    try {
      await window.api.db.createNote(title, content)
      setTitle('')
      setContent('')
      await loadNotes()
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await window.api.db.deleteNote(id)
      await loadNotes()
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleExportBackup = async (): Promise<void> => {
    try {
      const result = await window.api.db.exportBackup()
      setBackupMessage(`Backup saved: ${(result.sizeBytes / 1024).toFixed(1)} KB`)
      setTimeout(() => setBackupMessage(null), 4000)
    } catch (err) {
      console.error('Failed to export backup:', err)
      setBackupMessage('Backup export failed')
    }
  }

  return (
    <div
      className="view-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <div>
            <h2 className="card-title">Local SQLite Storage (WAL Mode)</h2>
            <p className="card-description">
              ACID transactional storage in userData with user_version schema migrations.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {backupMessage && <span className="badge badge-success">{backupMessage}</span>}
            <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
              Export Backup (.sqlite)
            </button>
          </div>
        </div>

        {/* Create Note Form */}
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}
        >
          <input
            className="input"
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="textarea"
            placeholder="Note content (optional)..."
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm">
              Add Note
            </button>
          </div>
        </form>

        {/* Search */}
        <div style={{ marginBottom: '14px' }}>
          <input
            className="input"
            type="search"
            placeholder="Search notes in SQLite..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              void loadNotes(e.target.value)
            }}
          />
        </div>

        {/* Notes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading notes...</p>
          )}
          {!loading && notes.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              No notes found. Create your first note above.
            </p>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{note.title}</div>
                {note.content && (
                  <div
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      marginTop: '2px'
                    }}
                  >
                    {note.content}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Created: {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => handleDelete(note.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
