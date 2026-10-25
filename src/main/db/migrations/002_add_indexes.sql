-- 002_add_indexes.sql: Performance indexes for notes table
CREATE INDEX IF NOT EXISTS ix_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notes_title ON notes(title);
