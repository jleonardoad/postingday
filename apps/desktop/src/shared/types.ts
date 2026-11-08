import { z } from 'zod'
import type { OutputKind } from './formats'

// ---------- Negocio ----------

export const CONTENT_LANGUAGES = ['es', 'en', 'both'] as const
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number]

export const NETWORKS = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google_business',
  'linkedin',
  'x'
] as const
export type Network = (typeof NETWORKS)[number]

export const SECTORS = [
  'food',
  'retail',
  'hardware',
  'fashion',
  'electronics',
  'health',
  'beauty',
  'services',
  'other'
] as const
export type Sector = (typeof SECTORS)[number]

export const TONES = ['close', 'professional', 'fun', 'direct'] as const
export type Tone = (typeof TONES)[number]

export const businessSchema = z.object({
  name: z.string().trim().max(120),
  sector: z.enum(SECTORS),
  city: z.string().trim().max(120),
  description: z.string().trim().max(2000),
  audience: z.string().trim().max(2000),
  tone: z.enum(TONES),
  language: z.enum(CONTENT_LANGUAGES),
  starProducts: z.string().trim().max(4000),
  neverSay: z.string().trim().max(2000),
  networks: z.array(z.enum(NETWORKS)),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoMediaId: z.number().int().nullable(),
  phone: z.string().trim().max(60),
  address: z.string().trim().max(240),
  hours: z.string().trim().max(240)
})

export type BusinessInput = z.infer<typeof businessSchema>
export interface Business extends BusinessInput {
  updatedAt: string | null
}

export const emptyBusiness: Business = {
  name: '',
  sector: 'retail',
  city: '',
  description: '',
  audience: '',
  tone: 'close',
  language: 'es',
  starProducts: '',
  neverSay: '',
  networks: ['instagram', 'facebook'],
  primaryColor: '#2563eb',
  secondaryColor: '#111827',
  logoMediaId: null,
  phone: '',
  address: '',
  hours: '',
  updatedAt: null
}

// ---------- Medios ----------

export type MediaKind = 'image' | 'video'

export interface MediaItem {
  id: number
  kind: MediaKind
  fileName: string
  originalName: string
  mime: string
  width: number | null
  height: number | null
  durationMs: number | null
  sizeBytes: number
  thumbName: string | null
  tags: string[]
  note: string
  createdAt: string
  /** URL servida por el protocolo pd-media:// para usar en <img>/<video> */
  url: string
  thumbUrl: string | null
}

export const mediaPatchSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  note: z.string().trim().max(1000).optional()
})
export type MediaPatch = z.infer<typeof mediaPatchSchema>

// ---------- Ajustes ----------

export const UI_LANGUAGES = ['es', 'en'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]

export const TEXT_PROVIDER_MODES = ['auto', 'claude', 'ollama', 'mock'] as const
export const IMAGE_PROVIDER_MODES = ['auto', 'openai', 'sdcpp', 'local', 'mock'] as const

export const settingsSchema = z.object({
  uiLanguage: z.enum(UI_LANGUAGES),
  /** Qué escribe los textos: auto = Claude si hay clave, si no Ollama, si no ejemplo */
  textProvider: z.enum(TEXT_PROVIDER_MODES).default('auto'),
  /** Modelo de Ollama; vacío = el mejor instalado */
  ollamaModel: z.string().max(120).default(''),
  /** Qué genera las imágenes: auto = OpenAI si hay clave, si no servidor local, si no ejemplo */
  imageProvider: z.enum(IMAGE_PROVIDER_MODES).default('auto'),
  /** URL del servidor local de imágenes (Draw Things / SD WebUI) */
  localImageUrl: z.string().max(200).default('http://127.0.0.1:7860')
})
export type AppSettings = z.infer<typeof settingsSchema>

export interface AppPaths {
  userData: string
  media: string
  thumbs: string
  exports: string
  db: string
  ffmpeg: string | null
  ffprobe: string | null
}

// ---------- Piezas de contenido (borradores generados) ----------

/** Límites de longitud que las plantillas pueden mostrar sin romperse */
export const TEXT_LIMITS = {
  kicker: 28,
  headline: 60,
  sub: 100,
  cta: 22,
  badge: 20,
  labelA: 14,
  labelB: 14,
  caption: 900,
  hashtag: 40
} as const

export const pieceTextsSchema = z.object({
  kicker: z.string().trim().max(TEXT_LIMITS.kicker),
  headline: z.string().trim().min(1).max(TEXT_LIMITS.headline),
  sub: z.string().trim().max(TEXT_LIMITS.sub),
  cta: z.string().trim().max(TEXT_LIMITS.cta),
  badge: z.string().trim().max(TEXT_LIMITS.badge).optional(),
  labelA: z.string().trim().max(TEXT_LIMITS.labelA).optional(),
  labelB: z.string().trim().max(TEXT_LIMITS.labelB).optional()
})
export type PieceTexts = z.infer<typeof pieceTextsSchema>

export const PIECE_STATUSES = ['draft', 'approved'] as const
export type PieceStatus = (typeof PIECE_STATUSES)[number]

export type ProviderName = 'mock' | 'claude' | 'ollama'

export interface Piece {
  id: number
  formatId: string
  ratio: OutputKind
  mediaIds: number[]
  texts: PieceTexts
  caption: string
  hashtags: string[]
  status: PieceStatus
  provider: ProviderName
  /** PNG exportado del post */
  exportPath: string | null
  /** MP4 exportado del reel */
  videoPath: string | null
  createdAt: string
  updatedAt: string
}

// ---------- Guion de reel (escenas) ----------

export type SceneRole = 'hook' | 'body' | 'cta' | 'labelA' | 'labelB'
export type KenBurns = 'in' | 'out' | 'left' | 'right' | 'none'

export interface ReelScene {
  index: number
  role: SceneRole
  /** 'photo' = Ken Burns sobre una foto, 'clip' = fragmento de vídeo, 'card' = fondo de marca */
  kind: 'photo' | 'clip' | 'card'
  mediaId: number | null
  durationSec: number
  /** Segundo del clip en el que empieza el fragmento */
  clipStartSec: number
  kenburns: KenBurns
  texts: { kicker?: string; headline?: string; sub?: string; cta?: string; badge?: string; label?: string }
}

export interface ReelScript {
  width: number
  height: number
  fps: number
  totalSec: number
  scenes: ReelScene[]
  music: { kind: 'demo' | 'file'; name: string | null }
}

export const generateInputSchema = z.object({
  formatId: z.string().min(1),
  mediaIds: z.array(z.number().int().positive()).max(4),
  ratio: z.enum(['post', 'reel']),
  /** De qué trata la publicación (producto, servicio, tema). Si falta, se usa el producto estrella */
  topic: z.string().trim().max(200).optional(),
  /** Si se indica, se reescriben los textos de esa pieza en vez de crear una nueva */
  pieceId: z.number().int().positive().optional()
})
export type GenerateInput = z.infer<typeof generateInputSchema>

// ---------- Imágenes generadas ----------

export const IMAGE_STYLES = ['studio', 'lifestyle', 'brand'] as const
export type ImageStyle = (typeof IMAGE_STYLES)[number]

export const imageInputSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  style: z.enum(IMAGE_STYLES).default('studio'),
  ratio: z.enum(['post', 'reel']).default('post')
})
export type ImageInput = z.infer<typeof imageInputSchema>

export type ImageProviderName = 'mock' | 'openai' | 'local' | 'sdcpp'
export type KeyName = 'anthropic' | 'openai'

export const piecePatchSchema = z.object({
  texts: pieceTextsSchema.optional(),
  caption: z.string().max(TEXT_LIMITS.caption).optional(),
  hashtags: z.array(z.string().trim().min(1).max(TEXT_LIMITS.hashtag)).max(15).optional(),
  status: z.enum(PIECE_STATUSES).optional(),
  ratio: z.enum(['post', 'reel']).optional(),
  mediaIds: z.array(z.number().int().positive()).max(4).optional()
})
export type PiecePatch = z.infer<typeof piecePatchSchema>

export interface AiStatus {
  /** Textos: proveedor que se usará ahora mismo */
  provider: ProviderName
  hasKey: boolean
  keySource: 'env' | 'settings' | null
  model: string
  ollama: { available: boolean; models: string[]; model: string | null }
  /** Imágenes */
  images: {
    provider: ImageProviderName
    hasKey: boolean
    keySource: 'env' | 'settings' | null
    model: string
    local: { available: boolean; url: string }
    /** Motor integrado (stable-diffusion.cpp + Z-Image-Turbo) */
    engine: { supported: boolean; installed: boolean; running: boolean; model: string; missing: string[] }
  }
}

export interface EngineInstallProgress {
  step: string
  done: number
  total: number
}
