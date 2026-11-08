import { FORMATS } from '@shared/formats'
import type { AiStatus, GenerateInput, KeyName, Piece } from '@shared/types'
import { getBusiness } from '../db/business'
import { getMedia } from '../db/media'
import { getPiece, insertPiece, replaceCopy } from '../db/pieces'
import { getSecret, setSecret } from '../db/settings'
import { imageStatus, OPENAI_SECRET } from '../images/generate'
import { ClaudeProvider, CLAUDE_MODEL, describeClaudeError } from './claude'
import { MockProvider } from './mock'
import type { TextProvider } from './provider'

const SECRET_NAME = 'anthropicApiKey'

function apiKey(): { key: string; source: 'env' | 'settings' } | null {
  const env = process.env.ANTHROPIC_API_KEY?.trim()
  if (env) return { key: env, source: 'env' }
  const stored = getSecret(SECRET_NAME)
  if (stored) return { key: stored, source: 'settings' }
  return null
}

export function aiStatus(): AiStatus {
  const k = apiKey()
  return { provider: k ? 'claude' : 'mock', hasKey: Boolean(k), keySource: k?.source ?? null, model: CLAUDE_MODEL, images: imageStatus() }
}

export function setApiKey(name: KeyName, key: string | null): AiStatus {
  const clean = key?.trim() || null
  if (name === 'anthropic') {
    if (clean && !/^sk-ant-/.test(clean)) throw new Error('La clave de Anthropic debe empezar por "sk-ant-".')
    setSecret(SECRET_NAME, clean)
  } else {
    if (clean && !/^sk-/.test(clean)) throw new Error('La clave de OpenAI debe empezar por "sk-".')
    setSecret(OPENAI_SECRET, clean)
  }
  return aiStatus()
}

export function pickProvider(): TextProvider {
  const k = apiKey()
  return k ? new ClaudeProvider(k.key) : new MockProvider()
}

export async function generatePiece(input: GenerateInput): Promise<Piece> {
  const format = FORMATS.find((f) => f.id === input.formatId)
  if (!format) throw new Error(`Formato desconocido: ${input.formatId}`)
  const business = getBusiness()
  const media = input.mediaIds.map((id) => getMedia(id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  const mediaNotes = media.map((m) => [m.note, ...m.tags].filter(Boolean).join(', ')).filter(Boolean)

  const provider = pickProvider()
  let copy
  try {
    copy = await provider.generate({ business, format, ratio: input.ratio, language: business.language, topic: input.topic ?? '', mediaNotes })
  } catch (err) {
    throw new Error(provider.name === 'claude' ? describeClaudeError(err) : (err as Error).message)
  }

  if (input.pieceId) {
    if (!getPiece(input.pieceId)) throw new Error(`Pieza ${input.pieceId} no existe`)
    return replaceCopy(input.pieceId, { ...copy, provider: provider.name })
  }
  return insertPiece({
    formatId: format.id,
    ratio: input.ratio,
    mediaIds: media.map((m) => m.id),
    texts: copy.texts,
    caption: copy.caption,
    hashtags: copy.hashtags,
    provider: provider.name
  })
}
