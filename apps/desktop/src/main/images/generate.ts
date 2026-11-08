import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AiStatus, ImageInput, MediaItem } from '@shared/types'
import { getBusiness } from '../db/business'
import { updateMedia } from '../db/media'
import { getSecret, getSettings } from '../db/settings'
import { importFile, type MediaDirs } from '../media/import'
import { LocalImageProvider, localImageAvailable } from './local'
import { MockImageProvider } from './mock'
import { OPENAI_IMAGE_MODEL, OpenAiImageProvider } from './openai'
import type { ImageProvider } from './provider'

export const OPENAI_SECRET = 'openaiApiKey'

export function openAiKey(): { key: string; source: 'env' | 'settings' } | null {
  const env = process.env.OPENAI_API_KEY?.trim()
  if (env) return { key: env, source: 'env' }
  const stored = getSecret(OPENAI_SECRET)
  if (stored) return { key: stored, source: 'settings' }
  return null
}

export async function imageStatus(): Promise<AiStatus['images']> {
  const k = openAiKey()
  const settings = getSettings()
  const localAvailable = await localImageAvailable(settings.localImageUrl)
  const provider = await pickImageProvider().catch(() => new MockImageProvider())
  return {
    provider: provider.name,
    hasKey: Boolean(k),
    keySource: k?.source ?? null,
    model: provider.name === 'openai' ? OPENAI_IMAGE_MODEL : provider.name === 'local' ? 'local' : 'ejemplo',
    local: { available: localAvailable, url: settings.localImageUrl }
  }
}

export async function pickImageProvider(): Promise<ImageProvider> {
  const settings = getSettings()
  const mode = settings.imageProvider
  const k = openAiKey()
  if ((mode === 'auto' || mode === 'openai') && k) return new OpenAiImageProvider(k.key)
  if (mode === 'openai') throw new Error('Has elegido OpenAI pero no hay clave de API de OpenAI en Ajustes.')
  if (mode === 'auto' || mode === 'local') {
    if (await localImageAvailable(settings.localImageUrl)) return new LocalImageProvider(settings.localImageUrl)
    if (mode === 'local') throw new Error(`No hay un generador de imágenes local en ${settings.localImageUrl}. Abre Draw Things con «API Server» activado o Stable Diffusion WebUI.`)
  }
  return new MockImageProvider()
}

/** Genera la imagen y la importa a la biblioteca con etiqueta «ia» y el tema como nota */
export async function generateImage(input: ImageInput, dirs: MediaDirs): Promise<MediaItem> {
  const provider = await pickImageProvider()
  const business = getBusiness()
  const { bytes, ext } = await provider.generate({ topic: input.topic, style: input.style, ratio: input.ratio, business })
  const tmp = await mkdtemp(join(tmpdir(), 'postingday-img-'))
  try {
    const safe = input.topic.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'imagen'
    const file = join(tmp, `${provider.name === 'mock' ? 'ejemplo' : 'ia'}-${safe}${ext}`)
    await writeFile(file, bytes)
    const item = await importFile(file, dirs)
    return updateMedia(item.id, { tags: ['ia', input.style, ...(provider.name === 'mock' ? ['ejemplo'] : [])], note: input.topic })
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
