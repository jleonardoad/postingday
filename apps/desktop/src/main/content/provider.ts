import type { ContentFormat, OutputKind } from '@shared/formats'
import { TEXT_LIMITS, type Business, type ContentLanguage, type PieceTexts, type ProviderName } from '@shared/types'

export interface GenerateRequest {
  business: Business
  format: ContentFormat
  ratio: OutputKind
  language: ContentLanguage
  /** De qué trata la publicación (producto, servicio, tema). Vacío = producto estrella */
  topic: string
  /** Notas y etiquetas de las fotos elegidas, para que el texto hable de lo que se ve */
  mediaNotes: string[]
}

export interface GeneratedCopy {
  texts: PieceTexts
  caption: string
  hashtags: string[]
}

export interface TextProvider {
  readonly name: ProviderName
  generate(req: GenerateRequest): Promise<GeneratedCopy>
}

/** Corta por palabra sin pasarse del máximo */
export function cut(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const sliced = t.slice(0, max)
  const lastSpace = sliced.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim()
}

export function normalizeHashtag(h: string): string | null {
  const clean = h.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
  if (!clean) return null
  return `#${cut(clean, TEXT_LIMITS.hashtag - 1)}`
}

/**
 * Convierte una respuesta cualquiera (del modelo o del generador de prueba)
 * en una copia válida: recorta longitudes y limpia hashtags en vez de fallar.
 */
export function clampCopy(raw: {
  kicker?: string
  headline?: string
  sub?: string
  cta?: string
  badge?: string
  labelA?: string
  labelB?: string
  caption?: string
  hashtags?: string[]
}): GeneratedCopy {
  const opt = (v: string | undefined, max: number): string | undefined => {
    const c = v ? cut(v, max) : ''
    return c ? c : undefined
  }
  const hashtags = Array.from(
    new Set((raw.hashtags ?? []).map(normalizeHashtag).filter((h): h is string => Boolean(h)))
  ).slice(0, 12)
  return {
    texts: {
      kicker: cut(raw.kicker ?? '', TEXT_LIMITS.kicker),
      headline: cut(raw.headline ?? '', TEXT_LIMITS.headline) || '—',
      sub: cut(raw.sub ?? '', TEXT_LIMITS.sub),
      cta: cut(raw.cta ?? '', TEXT_LIMITS.cta),
      badge: opt(raw.badge, TEXT_LIMITS.badge),
      labelA: opt(raw.labelA, TEXT_LIMITS.labelA),
      labelB: opt(raw.labelB, TEXT_LIMITS.labelB)
    },
    caption: cut(raw.caption ?? '', TEXT_LIMITS.caption),
    hashtags
  }
}
