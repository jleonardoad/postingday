import { DatabaseSync } from 'node:sqlite'
import { MIGRATIONS } from './migrations'

let db: DatabaseSync | null = null

export function openDb(file: string): DatabaseSync {
  db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  return db
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error('La base de datos no está abierta')
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

function migrate(d: DatabaseSync): void {
  d.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  const row = d.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').get() as {
    v: number
  }
  const current = row.v
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue
    d.exec('BEGIN')
    try {
      d.exec(m.sql)
      d.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(m.version)
      d.exec('COMMIT')
    } catch (err) {
      d.exec('ROLLBACK')
      throw new Error(`Migración ${m.version} falló: ${(err as Error).message}`)
    }
  }
}
