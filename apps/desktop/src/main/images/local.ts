/**
 * Imágenes con un servidor compatible con la API de AUTOMATIC1111:
 *  - el motor integrado (stable-diffusion.cpp + Z-Image-Turbo, ver sdcpp.ts), o
 *  - uno externo (Draw Things con «API Server», Stable Diffusion WebUI, Forge…).
 * Gratis y sin cuentas; el modelo corre en la propia máquina.
 */
import { buildImagePrompt, type ImageProvider, type ImageRequest } from './provider'

export const DEFAULT_LOCAL_IMAGE_URL = 'http://127.0.0.1:7860'

export async function localImageAvailable(url: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/sdapi/v1/sd-models`, { signal: AbortSignal.timeout(timeoutMs) })
    return res.ok
  } catch {
    return false
  }
}

export interface LocalParams {
  width: number
  height: number
  steps: number
  cfg_scale: number
  sampler_name?: string
}

export class LocalImageProvider implements ImageProvider {
  readonly name: 'local' | 'sdcpp'
  constructor(
    private url: string,
    private params: (ratio: ImageRequest['ratio']) => LocalParams,
    name: 'local' | 'sdcpp' = 'local'
  ) {
    this.name = name
  }

  async generate(req: ImageRequest): Promise<{ bytes: Buffer; ext: '.png' | '.jpg' }> {
    const base = this.url.replace(/\/$/, '')
    const body = {
      prompt: buildImagePrompt(req),
      negative_prompt: 'text, letters, watermark, logo, blurry, deformed, low quality, cropped, people, faces',
      batch_size: 1,
      ...this.params(req.ratio)
    }
    let res: Response
    try {
      res = await fetch(`${base}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(600_000)
      })
    } catch (err) {
      throw new Error(`El generador de imágenes local no responde en ${base} (${(err as Error).message}).`)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Generador local (${res.status}): ${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as { images?: string[] }
    const b64 = data.images?.[0]
    if (!b64) throw new Error('El generador local no devolvió ninguna imagen.')
    const clean = b64.replace(/^data:image\/\w+;base64,/, '')
    return { bytes: Buffer.from(clean, 'base64'), ext: '.png' }
  }
}

/** Parámetros genéricos para servidores externos (SDXL y similares) */
export function externalParams(ratio: ImageRequest['ratio']): LocalParams {
  return ratio === 'reel' ? { width: 832, height: 1216, steps: 20, cfg_scale: 5 } : { width: 1024, height: 1024, steps: 20, cfg_scale: 5 }
}
