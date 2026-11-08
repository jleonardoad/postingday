/**
 * Migraciones en orden. Nunca editar una ya publicada: añadir una nueva.
 */
export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE business (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT '',
        sector TEXT NOT NULL DEFAULT 'retail',
        city TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        audience TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT 'close',
        language TEXT NOT NULL DEFAULT 'es',
        star_products TEXT NOT NULL DEFAULT '',
        never_say TEXT NOT NULL DEFAULT '',
        networks TEXT NOT NULL DEFAULT '[]',
        primary_color TEXT NOT NULL DEFAULT '#2563eb',
        secondary_color TEXT NOT NULL DEFAULT '#111827',
        logo_media_id INTEGER,
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        hours TEXT NOT NULL DEFAULT '',
        updated_at TEXT
      );

      CREATE TABLE media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        file_name TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        mime TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        duration_ms INTEGER,
        size_bytes INTEGER NOT NULL,
        thumb_name TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX media_kind_idx ON media (kind);
    `
  },
  {
    version: 2,
    sql: `
      CREATE TABLE pieces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        format_id TEXT NOT NULL,
        ratio TEXT NOT NULL DEFAULT 'post',
        media_ids TEXT NOT NULL DEFAULT '[]',
        texts TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        hashtags TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        provider TEXT NOT NULL DEFAULT 'mock',
        export_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX pieces_status_idx ON pieces (status);
    `
  }
]
