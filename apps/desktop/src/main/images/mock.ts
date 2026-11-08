/**
 * Marcador de posición sin IA: una tarjeta con los colores de la marca y el
 * nombre del producto, dibujada por el renderer (#placeholder/...) y capturada
 * como PNG. Deja claro que es un ejemplo; sirve para probar el flujo completo
 * sin clave de API.
 */
import { CANVAS } from '@shared/formats'
import { captureRoute } from '../render/export'
import type { ImageProvider, ImageRequest } from './provider'

export class MockImageProvider implements ImageProvider {
  readonly name = 'mock' as const

  async generate(req: ImageRequest): Promise<{ bytes: Buffer; ext: '.png' | '.jpg' }> {
    const { w, h } = CANVAS[req.ratio]
    const topic = Buffer.from(req.topic, 'utf8').toString('base64url')
    const image = await captureRoute({ hash: `placeholder/${topic}/${req.ratio}`, width: w, height: h })
    return { bytes: image.toPNG(), ext: '.png' }
  }
}
