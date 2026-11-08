/**
 * Proveedor de textos con Claude (API de Anthropic).
 * Salida estructurada (JSON validado con zod) y fallback automático del servidor
 * si el modelo principal declina la petición.
 */
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { TEXT_LIMITS } from '@shared/types'
import { clampCopy, type GeneratedCopy, type GenerateRequest, type TextProvider } from './provider'

export const CLAUDE_MODEL = 'claude-opus-5-5'

/** Esquema de salida sin restricciones de longitud (las aplica clampCopy después) */
export const outputSchema = z.object({
  kicker: z.string(),
  headline: z.string(),
  sub: z.string(),
  cta: z.string(),
  badge: z.string(),
  labelA: z.string(),
  labelB: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string())
})

const TONES: Record<string, string> = {
  close: 'warm and close, like a trusted neighbor; informal but respectful',
  professional: 'professional and clear; confident, no slang',
  fun: 'playful and light; small jokes allowed, never silly',
  direct: 'direct and concise; no filler words'
}

const SECTORS: Record<string, string> = {
  food: 'restaurant / food business',
  retail: 'retail shop',
  hardware: 'hardware store',
  fashion: 'shoe / clothing store',
  electronics: 'appliances / electronics store',
  health: 'health clinic',
  beauty: 'beauty salon / barbershop',
  services: 'services / repair workshop',
  other: 'local business'
}

function languageRule(language: string): string {
  switch (language) {
    case 'en':
      return 'Write everything in US English.'
    case 'both':
      return 'Write kicker, headline, sub, cta, badge and labels in Spanish. Write the caption in Spanish first, then a blank line, then the same caption in US English. Hashtags: mix Spanish and English.'
    default:
      return 'Write everything in natural Latin American Spanish (neutral, "tú" form).'
  }
}

export function buildSystemPrompt(req: GenerateRequest): string {
  const b = req.business
  const lines = [
    'You write social media content for a small local business. The owner will review and approve what you write; it will be placed on a visual template, so respect the length limits strictly.',
    '',
    '# Business',
    `Name: ${b.name || '(not provided)'}`,
    `Type: ${SECTORS[b.sector] ?? b.sector}`,
    `City: ${b.city || '(not provided)'}`,
    `What they do and for whom: ${b.description || '(not provided)'}`,
    `Ideal customer: ${b.audience || '(not provided)'}`,
    `Star products or services: ${b.starProducts.replace(/\n+/g, '; ') || '(not provided)'}`,
    `Opening hours: ${b.hours || '(not provided)'}`,
    `Phone / WhatsApp: ${b.phone || '(not provided)'}`,
    `Address: ${b.address || '(not provided)'}`,
    '',
    '# Voice',
    `Tone: ${TONES[b.tone] ?? b.tone}.`,
    languageRule(req.language),
    b.neverSay ? `Never say or imply: ${b.neverSay}` : '',
    '',
    '# Rules',
    '- Never invent prices, discounts, dates, awards, certifications or facts that are not in the business data. Use generic wording instead ("special price", "this week").',
    '- No emojis in kicker, headline, sub, cta, badge or labels. The caption may use at most two emojis.',
    '- The caption ends with a clear call to action (message, visit, ask) and may mention the city.',
    '- Hashtags: 6 to 10, lowercase, no spaces, relevant to the business type and city, without the # symbol.',
    `- Length limits (characters): kicker ≤ ${TEXT_LIMITS.kicker}, headline ≤ ${TEXT_LIMITS.headline}, sub ≤ ${TEXT_LIMITS.sub}, cta ≤ ${TEXT_LIMITS.cta}, badge ≤ ${TEXT_LIMITS.badge}, labelA/labelB ≤ ${TEXT_LIMITS.labelA}, caption ≤ ${TEXT_LIMITS.caption}.`,
    '- If a field does not apply to the format, return an empty string for it.'
  ]
  return lines.filter((l) => l !== null).join('\n')
}

export function buildUserPrompt(req: GenerateRequest): string {
  const fields = ['kicker', 'headline', 'sub', 'cta', ...req.format.extraFields]
  const lines = [
    `# Format: ${req.format.id}`,
    req.format.brief,
    `Output shape: ${req.ratio === 'reel' ? 'vertical reel cover (9:16)' : 'square post (1:1)'}.`,
    `Fields used by this template: ${fields.join(', ')}. Return empty strings for the others.`,
    req.topic ? `This post is about: ${req.topic}. Make it the center of the copy.` : 'No specific topic: pick one of the star products or services.',
    req.mediaNotes.length ? `What the chosen photos show (owner's notes): ${req.mediaNotes.join(' | ')}` : 'No notes about the photos.',
    '',
    'The quoted examples in the format description are illustrations in English only: write every field in the content language stated in the rules, never copy the English examples.',
    `Language reminder: ${languageRule(req.language)}`,
    'Write the content now.'
  ]
  return lines.join('\n')
}

export class ClaudeProvider implements TextProvider {
  readonly name = 'claude' as const
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 })
  }

  async generate(req: GenerateRequest): Promise<GeneratedCopy> {
    const response = await this.client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: buildSystemPrompt(req),
      messages: [{ role: 'user', content: buildUserPrompt(req) }],
      output_config: { effort: 'medium', format: zodOutputFormat(outputSchema) }
    })

    if (response.stop_reason === 'refusal') {
      const why = response.stop_details?.explanation ?? ''
      throw new Error(`El modelo declinó la petición. ${why}`.trim())
    }
    if (response.stop_reason === 'max_tokens') {
      throw new Error('La respuesta del modelo se cortó (max_tokens). Inténtalo de nuevo.')
    }
    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('El modelo no devolvió JSON válido.')
    }
    const parsed = outputSchema.safeParse(json)
    if (!parsed.success) throw new Error(`Respuesta con formato inesperado: ${parsed.error.issues[0]?.message ?? ''}`)
    return clampCopy(parsed.data)
  }
}

/** Traduce errores del SDK a mensajes que el usuario entienda */
export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'La clave de API de Anthropic no es válida.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'La clave de API no tiene permiso para usar este modelo.'
  if (err instanceof Anthropic.RateLimitError) return 'Demasiadas peticiones a la API; espera un momento y vuelve a intentarlo.'
  if (err instanceof Anthropic.APIConnectionError) return 'No hay conexión con la API de Anthropic.'
  if (err instanceof Anthropic.APIError) return `Error de la API (${err.status}): ${err.message}`
  return err instanceof Error ? err.message : String(err)
}
