/**
 * Proveedor de textos con Ollama (modelos abiertos en la propia máquina).
 * Gratis, sin cuentas y sin enviar datos fuera. Usa la API nativa de Ollama
 * con salida estructurada (format = esquema JSON).
 */
import { TEXT_LIMITS } from '@shared/types'
import { buildSystemPrompt, buildUserPrompt, outputSchema } from './claude'
import type { Business } from '@shared/types'
import { clampCopy, describeProductPrompt, type GeneratedCopy, type GenerateRequest, type TextProvider } from './provider'

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

/** ¿Responde el servidor de Ollama? (aunque no tenga modelos) */
export async function ollamaReachable(timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(timeoutMs) })
    return res.ok
  } catch {
    return false
  }
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

  describeProduct(topic: string, business: Business): Promise<string> {
    return ollamaDescribeProduct(this.model, topic, business)
  }

  async generate(req: GenerateRequest, attempt = 1): Promise<GeneratedCopy> {
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
    const json = extractJson(content)
    if (json === undefined) {
      if (attempt < 2) return this.generate(req, attempt + 1)
      throw new Error(`El modelo ${this.model} no devolvió JSON válido. Prueba otro modelo en Ajustes.`)
    }
    const parsed = outputSchema.safeParse(json)
    if (!parsed.success) {
      if (attempt < 2) return this.generate(req, attempt + 1)
      throw new Error(`Respuesta del modelo con formato inesperado: ${parsed.error.issues[0]?.message ?? ''}`)
    }
    return clampCopy(parsed.data)
  }
}

export async function ollamaDescribeProduct(model: string, topic: string, business: Business): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    stream: false,
    messages: [{ role: 'user', content: describeProductPrompt(topic, business) }],
    options: { temperature: 0.3, num_predict: 80 }
  }
  if (THINKING_FAMILIES.test(model)) body.think = false
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000)
  })
  if (!res.ok) throw new Error(`Ollama (${res.status})`)
  const data = (await res.json()) as { message?: { content?: string } }
  const text = (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^["'\s]+|["'\s]+$/g, '').split('\n')[0] ?? ''
  return text.trim()
}

/**
 * Los modelos pequeños a veces envuelven el JSON en ```json … ``` o añaden
 * texto antes/después. Se recupera el primer objeto {…} equilibrado.
 */
export function extractJson(text: string): unknown {
  const clean = text.replace(/```(?:json)?/gi, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    /* seguir con la extracción */
  }
  const start = clean.indexOf('{')
  if (start < 0) return undefined
  let depth = 0
  let inString = false
  for (let i = start; i < clean.length; i++) {
    const c = clean[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(clean.slice(start, i + 1))
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}
