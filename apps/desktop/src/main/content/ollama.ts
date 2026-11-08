/**
 * Proveedor de textos con Ollama (modelos abiertos en la propia máquina).
 * Gratis, sin cuentas y sin enviar datos fuera. Usa la API nativa de Ollama
 * con salida estructurada (format = esquema JSON).
 */
import { TEXT_LIMITS } from '@shared/types'
import { buildSystemPrompt, buildUserPrompt, outputSchema } from './claude'
import { clampCopy, type GeneratedCopy, type GenerateRequest, type TextProvider } from './provider'

export const OLLAMA_URL = (process.env.OLLAMA_HOST?.startsWith('http') ? process.env.OLLAMA_HOST : 'http://127.0.0.1:11434').replace(/\/$/, '')

/** Modelos preferidos por calidad en español y fiabilidad con JSON, de mejor a peor */
export const PREFERRED_MODELS = ['qwen3:14b', 'qwen3:8b', 'gemma3:12b', 'gpt-oss:20b', 'qwen2.5:14b', 'qwen2.5:7b', 'gemma3:4b', 'llama3.1:8b', 'mistral']

const JSON_SCHEMA = {
  type: 'object',
  properties: {
    kicker: { type: 'string' },
    headline: { type: 'string' },
    sub: { type: 'string' },
    cta: { type: 'string' },
    badge: { type: 'string' },
    labelA: { type: 'string' },
    labelB: { type: 'string' },
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } }
  },
  required: ['kicker', 'headline', 'sub', 'cta', 'badge', 'labelA', 'labelB', 'caption', 'hashtags']
}

export async function ollamaModels(timeoutMs = 1500): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return []
    const data = (await res.json()) as { models?: { name: string }[] }
    return (data.models ?? []).map((m) => m.name)
  } catch {
    return []
  }
}

/** Elige el modelo: el configurado si está instalado; si no, el mejor de los instalados */
export function chooseModel(installed: string[], preferred: string): string | null {
  if (!installed.length) return null
  if (preferred && installed.includes(preferred)) return preferred
  for (const p of PREFERRED_MODELS) {
    const hit = installed.find((m) => m === p || m.startsWith(p + '-') || m.split(':')[0] === p.split(':')[0])
    if (hit) return hit
  }
  return installed[0] ?? null
}

/** Modelos con modo «pensar»: se desactiva para que respondan JSON directo y rápido */
const THINKING_FAMILIES = /^(qwen3|deepseek-r1|gpt-oss|magistral)/

export class OllamaProvider implements TextProvider {
  readonly name = 'ollama' as const
  constructor(readonly model: string) {}

  async generate(req: GenerateRequest): Promise<GeneratedCopy> {
    const body: Record<string, unknown> = {
      model: this.model,
      stream: false,
      format: JSON_SCHEMA,
      messages: [
        { role: 'system', content: buildSystemPrompt(req) + '\nRespond with a single JSON object only.' },
        { role: 'user', content: buildUserPrompt(req) }
      ],
      options: { temperature: 0.7, num_predict: Math.round(TEXT_LIMITS.caption * 1.5) + 400 }
    }
    if (THINKING_FAMILIES.test(this.model)) body.think = false

    let res: Response
    try {
      res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000)
      })
    } catch (err) {
      throw new Error(`Ollama no responde en ${OLLAMA_URL} (${(err as Error).message}). ¿Está abierto?`)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama (${res.status}): ${text.slice(0, 200)}`)
    }
    const data = (await res.json()) as { message?: { content?: string } }
    const content = data.message?.content ?? ''
    let json: unknown
    try {
      json = JSON.parse(content)
    } catch {
      throw new Error(`El modelo ${this.model} no devolvió JSON válido. Prueba otro modelo en Ajustes.`)
    }
    const parsed = outputSchema.safeParse(json)
    if (!parsed.success) throw new Error(`Respuesta del modelo con formato inesperado: ${parsed.error.issues[0]?.message ?? ''}`)
    return clampCopy(parsed.data)
  }
}
