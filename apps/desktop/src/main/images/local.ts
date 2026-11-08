/**
 * Imágenes con un servidor local compatible con la API de AUTOMATIC1111
 * (Draw Things con «API Server» activado, Stable Diffusion WebUI, Forge…).
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

export class LocalImageProvider implements ImageProvider {
  readonly name = 'local' as const
  constructor(private url: string) {}

  async generate(req: ImageRequest): Promise<{ bytes: Buffer; ext: '.png' | '.jpg' }> {
    const base = this.url.replace(/\/$/, '')
    const body = {
      prompt: buildImagePrompt(req),
      negative_prompt: 'text, letters, watermark, logo, blurry, deformed, low quality, cropped, people, faces',
      width: req.ratio === 'reel' ? 832 : 1024,
      height: req.ratio === 'reel' ? 1216 : 1024,
      steps: 20,
      cfg_scale: 5,
      batch_size: 1
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
    // A1111 devuelve PNG en base64 (a veces con prefijo data:)
    const clean = b64.replace(/^data:image\/\w+;base64,/, '')
    return { bytes: Buffer.from(clean, 'base64'), ext: '.png' }
  }
}
