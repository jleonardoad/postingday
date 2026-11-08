import { getDb } from './index'
import type { OutputKind } from '@shared/formats'
import {
  pieceTextsSchema,
  type Piece,
  type PiecePatch,
  type PieceStatus,
  type PieceTexts,
  type ProviderName
} from '@shared/types'

interface Row {
  id: number
  format_id: string
  ratio: OutputKind
  media_ids: string
  texts: string
  caption: string
  hashtags: string
  status: PieceStatus
  provider: ProviderName
  export_path: string | null
  created_at: string
  updated_at: string
}

function jsonArray<T>(s: string, guard: (v: unknown) => v is T): T[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.filter(guard) : []
  } catch {
    return []
  }
}
const isNumber = (v: unknown): v is number => typeof v === 'number'
const isString = (v: unknown): v is string => typeof v === 'string'

function rowToPiece(r: Row): Piece {
  let texts: PieceTexts = { kicker: '', headline: '—', sub: '', cta: '' }
  try {
    const parsed = pieceTextsSchema.safeParse(JSON.parse(r.texts))
    if (parsed.success) texts = parsed.data
  } catch {
    /* textos corruptos: se muestra el marcador */
  }
  return {
    id: r.id,
    formatId: r.format_id,
    ratio: r.ratio,
    mediaIds: jsonArray(r.media_ids, isNumber),
    texts,
    caption: r.caption,
    hashtags: jsonArray(r.hashtags, isString),
    status: r.status,
    provider: r.provider,
    exportPath: r.export_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }
}

export function listPieces(): Piece[] {
  const rows = getDb().prepare('SELECT * FROM pieces ORDER BY updated_at DESC, id DESC').all() as unknown as Row[]
  return rows.map(rowToPiece)
}

export function getPiece(id: number): Piece | null {
  const row = getDb().prepare('SELECT * FROM pieces WHERE id = ?').get(id) as unknown as Row | undefined
  return row ? rowToPiece(row) : null
}

export interface NewPiece {
  formatId: string
  ratio: OutputKind
  mediaIds: number[]
  texts: PieceTexts
  caption: string
  hashtags: string[]
  provider: ProviderName
}

export function insertPiece(p: NewPiece): Piece {
  const result = getDb()
    .prepare(
      `INSERT INTO pieces (format_id, ratio, media_ids, texts, caption, hashtags, provider)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(p.formatId, p.ratio, JSON.stringify(p.mediaIds), JSON.stringify(p.texts), p.caption, JSON.stringify(p.hashtags), p.provider)
  const piece = getPiece(Number(result.lastInsertRowid))
  if (!piece) throw new Error('No se pudo leer la pieza recién creada')
  return piece
}

/** Sustituye los textos generados (regenerar) manteniendo estado y medios */
export function replaceCopy(id: number, copy: { texts: PieceTexts; caption: string; hashtags: string[]; provider: ProviderName }): Piece {
  getDb()
    .prepare(`UPDATE pieces SET texts = ?, caption = ?, hashtags = ?, provider = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(copy.texts), copy.caption, JSON.stringify(copy.hashtags), copy.provider, id)
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  return piece
}

export function updatePiece(id: number, patch: PiecePatch): Piece {
  const current = getPiece(id)
  if (!current) throw new Error(`Pieza ${id} no existe`)
  const next = {
    ratio: patch.ratio ?? current.ratio,
    mediaIds: patch.mediaIds ?? current.mediaIds,
    texts: patch.texts ?? current.texts,
    caption: patch.caption ?? current.caption,
    hashtags: patch.hashtags ?? current.hashtags,
    status: patch.status ?? current.status
  }
  getDb()
    .prepare(
      `UPDATE pieces SET ratio = ?, media_ids = ?, texts = ?, caption = ?, hashtags = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(next.ratio, JSON.stringify(next.mediaIds), JSON.stringify(next.texts), next.caption, JSON.stringify(next.hashtags), next.status, id)
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  return piece
}

export function setExportPath(id: number, path: string): void {
  getDb().prepare('UPDATE pieces SET export_path = ? WHERE id = ?').run(path, id)
}

export function deletePiece(id: number): Piece | null {
  const current = getPiece(id)
  if (!current) return null
  getDb().prepare('DELETE FROM pieces WHERE id = ?').run(id)
  return current
}
