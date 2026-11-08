import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ImageInput, MediaItem } from '@shared/types'
import { getBusiness } from '../db/business'
import { updateMedia } from '../db/media'
import { getSecret } from '../db/settings'
import { importFile, type MediaDirs } from '../media/import'
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

export function imageStatus(): { provider: 'mock' | 'openai'; hasKey: boolean; keySource: 'env' | 'settings' | null; model: string } {
  const k = openAiKey()
  return { provider: k ? 'openai' : 'mock', hasKey: Boolean(k), keySource: k?.source ?? null, model: OPENAI_IMAGE_MODEL }
}

export function pickImageProvider(): ImageProvider {
  const k = openAiKey()
  return k ? new OpenAiImageProvider(k.key) : new MockImageProvider()
}

/** Genera la imagen y la importa a la biblioteca con etiqueta «ia» y el tema como nota */
export async function generateImage(input: ImageInput, dirs: MediaDirs): Promise<MediaItem> {
  const provider = pickImageProvider()
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
