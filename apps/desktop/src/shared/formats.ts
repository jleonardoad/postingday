/**
 * Catálogo de formatos de contenido. Cada formato es «lo que el dueño quiere
 * contar» (producto estrella, oferta, antes y después…) y se dibuja con una
 * plantilla visual (kind). Los textos de cara al usuario viven en i18n bajo
 * `formats.<id>`; `brief` es la descripción para el modelo de IA (en inglés,
 * el modelo escribe luego en el idioma del negocio).
 */
export type TemplateKind = 'hero' | 'offer' | 'compare' | 'talk' | 'quote'
export type OutputKind = 'reel' | 'post'

export interface ContentFormat {
  id: string
  kind: TemplateKind
  /** Salidas que produce, en orden de importancia */
  outputs: OutputKind[]
  /** Material que hace falta */
  needs: { photos: number; clips: number }
  /** Proporción con la que se muestra la vista previa en la galería */
  preview: OutputKind
  /** Qué campos de texto usa la plantilla además de kicker/headline/sub/cta */
  extraFields: ('badge' | 'labelA' | 'labelB')[]
  /** Instrucciones para la IA */
  brief: string
}

export const FORMATS: ContentFormat[] = [
  {
    id: 'star_product',
    kind: 'hero',
    outputs: ['post', 'reel'],
    needs: { photos: 1, clips: 0 },
    preview: 'post',
    extraFields: [],
    brief:
      'Star product: showcase one product the business is proud of. kicker = short label like "Product of the week"; headline = the product name or a punchy benefit (max 6 words); sub = one concrete benefit or who it is for; cta = what to do next (message, visit).'
  },
  {
    id: 'weekly_offer',
    kind: 'offer',
    outputs: ['post', 'reel'],
    needs: { photos: 1, clips: 0 },
    preview: 'post',
    extraFields: ['badge'],
    brief:
      'Weekly offer: a promotion with urgency. kicker = urgency label ("This week only"); headline = the offer in 2-4 words (do NOT invent prices or percentages; if none given, use words like "Special offer"); sub = product + condition + deadline in generic terms ("until Sunday"); badge = 2-3 word sticker ("Last days!"); cta = ask/visit.'
  },
  {
    id: 'new_arrival',
    kind: 'hero',
    outputs: ['reel', 'post'],
    needs: { photos: 1, clips: 0 },
    preview: 'reel',
    extraFields: [],
    brief:
      'New arrival: announce something that just came in. kicker = "Just arrived" style label; headline = short exclamation (max 5 words); sub = product + invitation to visit; cta = come see it.'
  },
  {
    id: 'before_after',
    kind: 'compare',
    outputs: ['post', 'reel'],
    needs: { photos: 2, clips: 0 },
    preview: 'post',
    extraFields: ['labelA', 'labelB'],
    brief:
      'Before and after: show a transformation with two photos. kicker = empty string; headline = short result statement (max 5 words); sub = what was done and by whom; labelA = "Before" word; labelB = "After" word (in the content language); cta = ask for a quote.'
  },
  {
    id: 'how_to',
    kind: 'talk',
    outputs: ['reel'],
    needs: { photos: 0, clips: 3 },
    preview: 'reel',
    extraFields: ['badge'],
    brief:
      'How-to / expert tip: a quick useful tip from the owner. kicker = "Expert tip" style label; headline = the tip as a hook, e.g. "3 mistakes with X" (max 8 words); sub = promise of what they learn in seconds; badge = short retention line ("Watch till the end"); cta = more tips / follow.'
  },
  {
    id: 'faq',
    kind: 'talk',
    outputs: ['reel', 'post'],
    needs: { photos: 1, clips: 0 },
    preview: 'reel',
    extraFields: ['badge'],
    brief:
      'Frequently asked question: answer a real customer question. kicker = "People ask us" style label; headline = the question itself (max 9 words); sub = the clear answer in one sentence, using the business data if relevant (hours, delivery, location) and never inventing facts; badge = "Quick answer" style; cta = ask us.'
  },
  {
    id: 'behind_scenes',
    kind: 'talk',
    outputs: ['reel'],
    needs: { photos: 0, clips: 2 },
    preview: 'reel',
    extraFields: ['badge'],
    brief:
      'Behind the scenes: show the team and how they work, human and honest. kicker = "How we work" style label; headline = short human line (max 6 words); sub = one sincere sentence about the people or the craft; badge = "No filters" style; cta = follow us.'
  },
  {
    id: 'testimonial',
    kind: 'quote',
    outputs: ['post'],
    needs: { photos: 1, clips: 0 },
    preview: 'post',
    extraFields: [],
    brief:
      'Testimonial: a customer quote. headline = the quote itself in quotation marks, natural spoken language, max 18 words, plausible but clearly a placeholder the owner must replace with a real quote; sub = customer first name + initial; kicker = "Customer of <business>"; cta = reviews.'
  }
]

export const CANVAS: Record<OutputKind, { w: number; h: number }> = {
  reel: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1080 }
}
