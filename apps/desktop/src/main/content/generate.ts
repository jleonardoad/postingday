import { FORMATS } from '@shared/formats'
import type { AiStatus, GenerateInput, KeyName, Piece } from '@shared/types'
import { getBusiness } from '../db/business'
import { getMedia } from '../db/media'
import { getPiece, insertPiece, replaceCopy } from '../db/pieces'
import { getSecret, getSettings, setSecret } from '../db/settings'
import { imageStatus, OPENAI_SECRET } from '../images/generate'
import { ClaudeProvider, CLAUDE_MODEL, describeClaudeError } from './claude'
import { MockProvider } from './mock'
import { chooseModel, ollamaModels, OllamaProvider } from './ollama'
import type { TextProvider } from './provider'

const SECRET_NAME = 'anthropicApiKey'

function apiKey(): { key: string; source: 'env' | 'settings' } | null {
  const env = process.env.ANTHROPIC_API_KEY?.trim()
  if (env) return { key: env, source: 'env' }
  const stored = getSecret(SECRET_NAME)
  if (stored) return { key: stored, source: 'settings' }
  return null
}

export async function aiStatus(): Promise<AiStatus> {
  const k = apiKey()
  const settings = getSettings()
  const installed = await ollamaModels()
  const ollamaModel = chooseModel(installed, settings.ollamaModel)
  const provider = await pickProvider()
  return {
    provider: provider.name,
    hasKey: Boolean(k),
    keySource: k?.source ?? null,
    model: provider.name === 'claude' ? CLAUDE_MODEL : provider.name === 'ollama' ? (provider as OllamaProvider).model : 'ejemplo',
    ollama: { available: installed.length > 0, models: installed, model: ollamaModel },
    images: await imageStatus()
  }
}

export async function setApiKey(name: KeyName, key: string | null): Promise<AiStatus> {
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

export async function pickProvider(): Promise<TextProvider> {
  const settings = getSettings()
  const mode = settings.textProvider
  const k = apiKey()
  if ((mode === 'auto' || mode === 'claude') && k) return new ClaudeProvider(k.key)
  if (mode === 'claude') throw new Error('Has elegido Claude pero no hay clave de API de Anthropic en Ajustes.')
  if (mode === 'auto' || mode === 'ollama') {
    const model = chooseModel(await ollamaModels(), settings.ollamaModel)
    if (model) return new OllamaProvider(model)
    if (mode === 'ollama') throw new Error('Has elegido Ollama pero no hay ningún modelo instalado (ejecuta: ollama pull qwen3:8b).')
  }
  return new MockProvider()
}

export async function generatePiece(input: GenerateInput): Promise<Piece> {
  const format = FORMATS.find((f) => f.id === input.formatId)
  if (!format) throw new Error(`Formato desconocido: ${input.formatId}`)
  const business = getBusiness()
  const media = input.mediaIds.map((id) => getMedia(id)).filter((m): m is NonNullable<typeof m> => Boolean(m))
  const mediaNotes = media.map((m) => [m.note, ...m.tags].filter(Boolean).join(', ')).filter(Boolean)

  const provider = await pickProvider()
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
