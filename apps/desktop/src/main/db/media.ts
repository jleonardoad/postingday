import { getDb } from './index'
import { mediaPatchSchema, type MediaItem, type MediaKind, type MediaPatch } from '@shared/types'
import { mediaUrl, thumbUrl } from '../protocol'

interface Row {
  id: number
  kind: MediaKind
  file_name: string
  original_name: string
  mime: string
  width: number | null
  height: number | null
  duration_ms: number | null
  size_bytes: number
  thumb_name: string | null
  tags: string
  note: string
  created_at: string
}

function rowToItem(r: Row): MediaItem {
  let tags: string[] = []
  try {
    const v = JSON.parse(r.tags)
    if (Array.isArray(v)) tags = v.filter((t) => typeof t === 'string')
  } catch {
    /* etiquetas corruptas: lista vacía */
  }
  return {
    id: r.id,
    kind: r.kind,
    fileName: r.file_name,
    originalName: r.original_name,
    mime: r.mime,
    width: r.width,
    height: r.height,
    durationMs: r.duration_ms,
    sizeBytes: r.size_bytes,
    thumbName: r.thumb_name,
    tags,
    note: r.note,
    createdAt: r.created_at,
    url: mediaUrl(r.file_name),
    thumbUrl: r.thumb_name ? thumbUrl(r.thumb_name) : null
  }
}

export interface NewMedia {
  kind: MediaKind
  fileName: string
  originalName: string
  mime: string
  width: number | null
  height: number | null
  durationMs: number | null
  sizeBytes: number
  thumbName: string | null
}

export function listMedia(): MediaItem[] {
  const rows = getDb()
    .prepare('SELECT * FROM media ORDER BY created_at DESC, id DESC')
    .all() as unknown as Row[]
  return rows.map(rowToItem)
}

export function getMedia(id: number): MediaItem | null {
  const row = getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as unknown as
    | Row
    | undefined
  return row ? rowToItem(row) : null
}

export function insertMedia(m: NewMedia): MediaItem {
  const result = getDb()
    .prepare(
      `INSERT INTO media (kind, file_name, original_name, mime, width, height, duration_ms, size_bytes, thumb_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      m.kind,
      m.fileName,
      m.originalName,
      m.mime,
      m.width,
      m.height,
      m.durationMs,
      m.sizeBytes,
      m.thumbName
    )
  const item = getMedia(Number(result.lastInsertRowid))
  if (!item) throw new Error('No se pudo leer el medio recién insertado')
  return item
}

export function updateMedia(id: number, patch: MediaPatch): MediaItem {
  const p = mediaPatchSchema.parse(patch)
  const current = getMedia(id)
  if (!current) throw new Error(`Medio ${id} no existe`)
  getDb()
    .prepare('UPDATE media SET tags = ?, note = ? WHERE id = ?')
    .run(JSON.stringify(p.tags ?? current.tags), p.note ?? current.note, id)
  const item = getMedia(id)
  if (!item) throw new Error(`Medio ${id} no existe`)
  return item
}

export function deleteMedia(id: number): MediaItem | null {
  const current = getMedia(id)
  if (!current) return null
  getDb().prepare('DELETE FROM media WHERE id = ?').run(id)
  return current
}
