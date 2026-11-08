import type { OutputKind } from '@shared/formats'
import type { Business, ImageProviderName, ImageStyle } from '@shared/types'

export interface ImageRequest {
  topic: string
  /** Descripción visual en inglés (la escribe el proveedor de textos); si falta se usa topic */
  topicEnglish?: string
  style: ImageStyle
  ratio: OutputKind
  business: Business
}

export interface ImageProvider {
  readonly name: ImageProviderName
  /** Devuelve los bytes de un PNG o JPEG */
  generate(req: ImageRequest): Promise<{ bytes: Buffer; ext: '.png' | '.jpg' }>
}

const SECTORS: Record<string, string> = {
  food: 'restaurant',
  retail: 'retail shop',
  hardware: 'hardware store',
  fashion: 'shoe and clothing store',
  electronics: 'appliances and electronics store',
  health: 'health clinic',
  beauty: 'beauty salon',
  services: 'repair workshop',
  other: 'local business'
}

/** Prompt en inglés (los modelos de imagen responden mejor); el producto puede ir en español */
export function buildImagePrompt(req: ImageRequest): string {
  const sector = SECTORS[req.business.sector] ?? 'local business'
  const style =
    req.style === 'lifestyle'
      ? 'The product shown in realistic everyday use in its natural setting, natural light, shallow depth of field.'
      : req.style === 'brand'
        ? `The product centered on a solid background of color ${req.business.primaryColor}, soft studio lighting, subtle shadow.`
        : 'Clean studio product shot on a soft light gray background, centered, soft diffused lighting, gentle shadow.'
  const orientation = req.ratio === 'reel' ? 'Vertical composition with room above and below the product.' : 'Square composition.'
  return [
    `Professional commercial photograph of: ${req.topicEnglish || req.topic}.`,
    `It is a product sold by a ${sector}.`,
    style,
    orientation,
    'Photorealistic, sharp focus, high detail. No text, no letters, no logos, no watermarks, no human faces.'
  ].join(' ')
}
