import { getDb } from './index'
import { businessSchema, emptyBusiness, type Business, type BusinessInput } from '@shared/types'

interface Row {
  name: string
  sector: string
  city: string
  description: string
  audience: string
  tone: string
  language: string
  star_products: string
  never_say: string
  networks: string
  primary_color: string
  secondary_color: string
  logo_media_id: number | null
  phone: string
  address: string
  hours: string
  updated_at: string | null
}

function rowToBusiness(r: Row): Business {
  const candidate = {
    name: r.name,
    sector: r.sector,
    city: r.city,
    description: r.description,
    audience: r.audience,
    tone: r.tone,
    language: r.language,
    starProducts: r.star_products,
    neverSay: r.never_say,
    networks: safeJsonArray(r.networks),
    primaryColor: r.primary_color,
    secondaryColor: r.secondary_color,
    logoMediaId: r.logo_media_id,
    phone: r.phone,
    address: r.address,
    hours: r.hours
  }
  const parsed = businessSchema.safeParse(candidate)
  // Si alguna columna trae un valor fuera de catálogo (p. ej. tras cambiar enums),
  // se devuelve lo válido mezclado con los valores por defecto en vez de romper la app.
  const data = parsed.success ? parsed.data : { ...emptyBusiness, ...sanitize(candidate) }
  return { ...data, updatedAt: r.updated_at }
}

function sanitize(c: Record<string, unknown>): Partial<BusinessInput> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(businessSchema.shape) as (keyof BusinessInput)[]) {
    const single = businessSchema.shape[key].safeParse(c[key])
    if (single.success) out[key] = single.data
  }
  return out as Partial<BusinessInput>
}

function safeJsonArray(s: string): unknown {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function getBusiness(): Business {
  const row = getDb().prepare('SELECT * FROM business WHERE id = 1').get() as Row | undefined
  return row ? rowToBusiness(row) : { ...emptyBusiness }
}

export function saveBusiness(input: BusinessInput): Business {
  const b = businessSchema.parse(input)
  getDb()
    .prepare(
      `INSERT INTO business (
        id, name, sector, city, description, audience, tone, language, star_products, never_say,
        networks, primary_color, secondary_color, logo_media_id, phone, address, hours, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, sector = excluded.sector, city = excluded.city,
        description = excluded.description, audience = excluded.audience, tone = excluded.tone,
        language = excluded.language, star_products = excluded.star_products,
        never_say = excluded.never_say, networks = excluded.networks,
        primary_color = excluded.primary_color, secondary_color = excluded.secondary_color,
        logo_media_id = excluded.logo_media_id, phone = excluded.phone,
        address = excluded.address, hours = excluded.hours, updated_at = excluded.updated_at`
    )
    .run(
      b.name,
      b.sector,
      b.city,
      b.description,
      b.audience,
      b.tone,
      b.language,
      b.starProducts,
      b.neverSay,
      JSON.stringify(b.networks),
      b.primaryColor,
      b.secondaryColor,
      b.logoMediaId,
      b.phone,
      b.address,
      b.hours
    )
  return getBusiness()
}
