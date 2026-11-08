import { app } from 'electron'
import { getDb } from './index'
import { settingsSchema, type AppSettings } from '@shared/types'

function defaults(): AppSettings {
  const locale = app.getLocale().toLowerCase()
  return { uiLanguage: locale.startsWith('es') ? 'es' : 'en' }
}

export function getSettings(): AppSettings {
  const rows = getDb().prepare("SELECT key, value FROM settings WHERE key NOT LIKE 'secret:%'").all() as {
    key: string
    value: string
  }[]
  const raw: Record<string, unknown> = { ...defaults() }
  for (const r of rows) {
    try {
      raw[r.key] = JSON.parse(r.value)
    } catch {
      /* valor corrupto: se ignora y se usa el valor por defecto */
    }
  }
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : defaults()
}

/**
 * Secretos (claves de API) guardados en la misma tabla con prefijo propio.
 * Nunca forman parte de AppSettings, así que no llegan al renderer.
 */
export function getSecret(name: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(`secret:${name}`) as
    | { value: string }
    | undefined
  if (!row) return null
  try {
    const v = JSON.parse(row.value)
    return typeof v === 'string' && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function setSecret(name: string, value: string | null): void {
  if (!value) {
    getDb().prepare('DELETE FROM settings WHERE key = ?').run(`secret:${name}`)
    return
  }
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(`secret:${name}`, JSON.stringify(value))
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = settingsSchema.parse({ ...getSettings(), ...patch })
  const stmt = getDb().prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  for (const [k, v] of Object.entries(next)) stmt.run(k, JSON.stringify(v))
  return next
}
