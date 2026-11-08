/**
 * Imágenes con la API de OpenAI (gpt-image-1). Se llama por HTTP directamente:
 * un solo endpoint, sin dependencia extra.
 */
import { buildImagePrompt, type ImageProvider, type ImageRequest } from './provider'

export const OPENAI_IMAGE_MODEL = process.env.PD_OPENAI_IMAGE_MODEL || 'gpt-image-1'

export class OpenAiImageProvider implements ImageProvider {
  readonly name = 'openai' as const
  constructor(private apiKey: string) {}

  async generate(req: ImageRequest): Promise<{ bytes: Buffer; ext: '.png' | '.jpg' }> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt: buildImagePrompt(req),
          n: 1,
          size: req.ratio === 'reel' ? '1024x1536' : '1024x1024',
          quality: 'medium',
          output_format: 'jpeg'
        })
      })
    } catch (err) {
      throw new Error(`No hay conexión con la API de OpenAI (${(err as Error).message})`)
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      let detail = ''
      try {
        const j = (await res.json()) as { error?: { message?: string } }
        detail = j.error?.message ?? ''
      } catch {
        /* sin cuerpo JSON */
      }
      if (res.status === 401) throw new Error('La clave de API de OpenAI no es válida.')
      if (res.status === 429) throw new Error('OpenAI: límite de uso alcanzado o sin crédito. ' + detail)
      throw new Error(`OpenAI (${res.status}): ${detail || res.statusText}`)
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] }
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('OpenAI no devolvió ninguna imagen.')
    return { bytes: Buffer.from(b64, 'base64'), ext: '.jpg' }
  }
}
