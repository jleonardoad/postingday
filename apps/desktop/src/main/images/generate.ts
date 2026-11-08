import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AiStatus, ImageInput, ImageProviderName, MediaItem } from '@shared/types'
import { pickProvider as pickTextProvider } from '../content/generate'
import { getBusiness } from '../db/business'
import { updateMedia } from '../db/media'
import { getSecret, getSettings } from '../db/settings'
import { importFile, type MediaDirs } from '../media/import'
import { externalParams, LocalImageProvider, localImageAvailable } from './local'
import { engineParams, engineStatus, ensureEngine } from './sdcpp'
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

let userDataDir = ''
export function setImagesUserData(dir: string): void {
  userDataDir = dir
}

export async function imageStatus(): Promise<AiStatus['images']> {
  const k = openAiKey()
  const settings = getSettings()
  const localAvailable = await localImageAvailable(settings.localImageUrl)
  const eng = await engineStatus(userDataDir)
  const name = await pickImageProviderName()
  return {
    provider: name,
    hasKey: Boolean(k),
    keySource: k?.source ?? null,
    model: name === 'openai' ? OPENAI_IMAGE_MODEL : name === 'sdcpp' ? eng.model : name === 'local' ? 'local' : 'ejemplo',
    local: { available: localAvailable, url: settings.localImageUrl },
    engine: {
      supported: eng.supported,
      installed: eng.installed,
      running: eng.running,
      model: eng.model,
      missing: [...(eng.binary ? [] : ['sd-server']), ...eng.models.filter((m) => !m.present).map((m) => m.name)]
    }
  }
}

/** Qué proveedor se usaría ahora (sin arrancar nada) */
async function pickImageProviderName(): Promise<ImageProviderName> {
  const settings = getSettings()
  const mode = settings.imageProvider
  const k = openAiKey()
  if ((mode === 'auto' || mode === 'openai') && k) return 'openai'
  if (mode === 'openai') return 'mock'
  if (mode === 'auto' || mode === 'sdcpp') {
    if ((await engineStatus(userDataDir)).installed) return 'sdcpp'
    if (mode === 'sdcpp') return 'mock'
  }
  if (mode === 'auto' || mode === 'local') {
    if (await localImageAvailable(settings.localImageUrl)) return 'local'
  }
  return 'mock'
}

export async function pickImageProvider(): Promise<ImageProvider> {
  const settings = getSettings()
  const mode = settings.imageProvider
  const k = openAiKey()
  if ((mode === 'auto' || mode === 'openai') && k) return new OpenAiImageProvider(k.key)
  if (mode === 'openai') throw new Error('Has elegido OpenAI pero no hay clave de API de OpenAI en Ajustes.')
  if (mode === 'auto' || mode === 'sdcpp') {
    if ((await engineStatus(userDataDir)).installed) {
      const port = await ensureEngine(userDataDir)
      return new LocalImageProvider(`http://127.0.0.1:${port}`, engineParams, 'sdcpp')
    }
    if (mode === 'sdcpp') throw new Error('El motor de imágenes integrado no está instalado. Ve a Ajustes → Imágenes → Instalar motor local.')
  }
  if (mode === 'auto' || mode === 'local') {
    if (await localImageAvailable(settings.localImageUrl)) return new LocalImageProvider(settings.localImageUrl, externalParams, 'local')
    if (mode === 'local') throw new Error(`No hay un generador de imágenes local en ${settings.localImageUrl}. Abre Draw Things con «API Server» activado o Stable Diffusion WebUI.`)
  }
  return new MockImageProvider()
}

/** Genera la imagen y la importa a la biblioteca con etiqueta «ia» y el tema como nota */
export async function generateImage(input: ImageInput, dirs: MediaDirs): Promise<MediaItem> {
  const provider = await pickImageProvider()
  const business = getBusiness()
  let topicEnglish: string | undefined
  if (provider.name !== 'mock') {
    try {
      const text = await pickTextProvider()
      topicEnglish = (await text.describeProduct?.(input.topic, business))?.trim() || undefined
      if (topicEnglish) console.log(`[images] «${input.topic}» → "${topicEnglish}"`)
    } catch (err) {
      console.warn('[images] sin descripción en inglés:', (err as Error).message)
    }
  }
  const { bytes, ext } = await provider.generate({ topic: input.topic, topicEnglish, style: input.style, ratio: input.ratio, business })
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
