/**
 * Generador de prueba: produce textos coherentes con el negocio sin llamar a
 * ninguna IA. Sirve para desarrollar y para que la app funcione sin clave.
 * Los textos se marcan como «ejemplo» en la interfaz.
 */
import type { Sector } from '@shared/types'
import { clampCopy, type GeneratedCopy, type GenerateRequest, type TextProvider } from './provider'

type Lang = 'es' | 'en'

interface Variant {
  kicker: string[]
  headline: string[]
  sub: string[]
  cta: string[]
  badge?: string[]
  labelA?: string
  labelB?: string
  caption: string[]
}

/* Marcadores: {product} {business} {city} {hours} {phone} */
const ES: Record<string, Variant> = {
  star_product: {
    kicker: ['Producto de la semana', 'El más vendido', 'Favorito de la casa'],
    headline: ['{product}', '{product}', 'Lo que todos piden'],
    sub: ['Calidad que dura, al precio justo', 'El que más nos piden en {city}', 'Pregúntanos por él en {business}'],
    cta: ['Escríbenos', 'Ven a verlo', 'Pregunta aquí'],
    caption: [
      '{product}: lo tenemos en {business}. Si buscas algo que dure, es este. Pásate o escríbenos y te contamos todo.',
      'Esta semana destacamos {product}. Es el que más se llevan nuestros clientes en {city}, y por algo será. ¿Lo quieres? Escríbenos.'
    ]
  },
  weekly_offer: {
    kicker: ['Solo esta semana', 'Oferta de la semana', 'Por tiempo limitado'],
    headline: ['Oferta especial', 'Precio especial', 'Aprovecha ahora'],
    sub: ['{product} · hasta el domingo', '{product} · solo esta semana', 'En {business} hasta agotar existencias'],
    cta: ['Pregunta aquí', 'Escríbenos', 'Ven hoy'],
    badge: ['¡Últimos días!', 'Solo hoy', 'Hasta el domingo'],
    caption: [
      'Oferta de la semana en {business}: {product} con precio especial hasta el domingo. Escríbenos para apartar el tuyo.',
      'Esta semana, {product} con un precio que no se repite. Válido hasta el domingo en {business}, {city}.'
    ]
  },
  new_arrival: {
    kicker: ['Recién llegado', 'Novedad', 'Ya disponible'],
    headline: ['Ya está aquí', 'Acaba de llegar', 'Nuevo en tienda'],
    sub: ['{product} · pásate por {business}', 'Llegó {product}. Ven a verlo', 'Lo nuevo de {business} en {city}'],
    cta: ['Ven a verlo', 'Escríbenos', 'Reserva el tuyo'],
    caption: [
      'Acaba de llegar a {business}: {product}. Pocas unidades, así que si te interesa, escríbenos y te lo apartamos.',
      'Novedad en {business}: ya tenemos {product}. Pásate por {city} y míralo en persona.'
    ]
  },
  before_after: {
    kicker: ['', '', ''],
    headline: ['Así quedó', 'De esto a esto', 'Mira el cambio'],
    sub: ['Trabajo hecho por {business}', 'Hecho con cariño en {business}', 'Así trabajamos en {business}, {city}'],
    cta: ['Pide tu presupuesto', 'Escríbenos', 'Consulta sin compromiso'],
    labelA: 'Antes',
    labelB: 'Después',
    caption: [
      'Antes y después de un trabajo reciente en {business}. ¿Tienes algo parecido en casa? Escríbenos y te decimos cómo lo haríamos.',
      'Así quedó. Trabajo de {business} en {city}. Pide tu presupuesto sin compromiso.'
    ]
  },
  how_to: {
    kicker: ['Consejo del experto', 'Tip rápido', 'Lo que nadie te dice'],
    headline: ['3 errores al usar {product}', 'Cómo elegir {product}', 'Esto alarga la vida de {product}'],
    sub: ['Y cómo evitarlos en 20 segundos', 'Lo que aprendimos en años de mostrador', 'Un minuto que te ahorra dinero'],
    cta: ['Más consejos', 'Síguenos', 'Pregúntanos'],
    badge: ['Mira hasta el final', 'Guárdalo', 'Compártelo'],
    caption: [
      'Un consejo rápido desde {business}: así sacas más partido a {product}. ¿Dudas? Pregúntanos, para eso estamos.',
      'En {business} vemos este error todas las semanas. Guárdate este vídeo y evítalo.'
    ]
  },
  faq: {
    kicker: ['Nos preguntan mucho', 'Pregunta frecuente', 'Respondemos'],
    headline: ['¿Hacen envíos a domicilio?', '¿A qué hora abren?', '¿Tienen {product}?'],
    sub: ['Escríbenos y te lo confirmamos al momento', 'Horario: {hours}', 'Sí, en {business}, {city}'],
    cta: ['Pregúntanos', 'Escríbenos', 'Más info'],
    badge: ['Respuesta rápida', 'Te contestamos', 'Sin rodeos'],
    caption: [
      'Nos lo preguntan todos los días, así que aquí va la respuesta. ¿Otra duda? Escríbenos a {business}.',
      'Pregunta frecuente en {business}: respondida. Horario: {hours}. Estamos en {city}.'
    ]
  },
  behind_scenes: {
    kicker: ['Así trabajamos', 'Detrás del mostrador', 'Un día normal'],
    headline: ['Un día en {business}', 'Lo que no se ve', 'Así preparamos todo'],
    sub: ['Lo que no se ve desde el mostrador', 'Las personas detrás de {business}', 'Trabajo de todos los días en {city}'],
    cta: ['Síguenos', 'Ven a conocernos', 'Escríbenos'],
    badge: ['Sin filtros', 'En serio', 'Día a día'],
    caption: [
      'Un vistazo a cómo trabajamos en {business}. Sin guion y sin filtros: así es un día normal en {city}.',
      'Detrás de cada pedido hay personas. Esto es {business} por dentro.'
    ]
  },
  testimonial: {
    kicker: ['Cliente de {business}', 'Opinión real', 'Lo que dicen de nosotros'],
    headline: ['“Me atendieron rapidísimo y el producto llegó perfecto.”', '“Fui por una cosa y salí con la solución completa.”', '“Precio justo y te explican todo sin prisa.”'],
    sub: ['María G.', 'Carlos R.', 'Ana P.'],
    cta: ['Opiniones', 'Escríbenos', 'Visítanos'],
    caption: [
      'Gracias por confiar en {business}. Comentarios así son la razón por la que abrimos cada día en {city}.',
      'Lo que dicen nuestros clientes vale más que cualquier anuncio. Gracias por elegir {business}.'
    ]
  }
}

const EN: Record<string, Variant> = {
  star_product: {
    kicker: ['Product of the week', 'Best seller', 'Customer favorite'],
    headline: ['{product}', '{product}', 'The one everyone asks for'],
    sub: ['Built to last, fairly priced', 'The most requested in {city}', 'Ask for it at {business}'],
    cta: ['Message us', 'Come see it', 'Ask here'],
    caption: [
      '{product}: we have it at {business}. If you want something that lasts, this is it. Stop by or message us.',
      "This week we're featuring {product}. It's what our customers in {city} take home most, and for good reason. Want it? Message us."
    ]
  },
  weekly_offer: {
    kicker: ['This week only', 'Weekly offer', 'Limited time'],
    headline: ['Special offer', 'Special price', 'Grab it now'],
    sub: ['{product} · until Sunday', '{product} · this week only', 'At {business} while stock lasts'],
    cta: ['Ask here', 'Message us', 'Visit today'],
    badge: ['Last days!', 'Today only', 'Until Sunday'],
    caption: [
      'Weekly offer at {business}: {product} at a special price until Sunday. Message us to reserve yours.',
      "This week, {product} at a price that won't repeat. Valid until Sunday at {business}, {city}."
    ]
  },
  new_arrival: {
    kicker: ['Just arrived', 'New in', 'Now available'],
    headline: ["It's here", 'Just landed', 'New in store'],
    sub: ['{product} · stop by {business}', '{product} just arrived. Come see it', "What's new at {business} in {city}"],
    cta: ['Come see it', 'Message us', 'Reserve yours'],
    caption: [
      'Just arrived at {business}: {product}. Limited units, so if you want one, message us and we will hold it.',
      'New at {business}: {product} is in. Stop by {city} and see it in person.'
    ]
  },
  before_after: {
    kicker: ['', '', ''],
    headline: ['Done', 'From this to this', 'See the change'],
    sub: ['Work by {business}', 'Made with care at {business}', 'How we work at {business}, {city}'],
    cta: ['Get a quote', 'Message us', 'Free consultation'],
    labelA: 'Before',
    labelB: 'After',
    caption: [
      'Before and after from a recent job at {business}. Got something similar at home? Message us and we will tell you how we would do it.',
      'Done. Work by {business} in {city}. Ask for a free quote.'
    ]
  },
  how_to: {
    kicker: ['Expert tip', 'Quick tip', 'What nobody tells you'],
    headline: ['3 mistakes with {product}', 'How to choose {product}', 'This makes {product} last longer'],
    sub: ['And how to avoid them in 20 seconds', 'What years behind the counter taught us', 'One minute that saves you money'],
    cta: ['More tips', 'Follow us', 'Ask us'],
    badge: ['Watch till the end', 'Save this', 'Share it'],
    caption: [
      'A quick tip from {business}: get more out of {product}. Questions? Ask us, that is what we are here for.',
      'At {business} we see this mistake every week. Save this video and avoid it.'
    ]
  },
  faq: {
    kicker: ['People ask us', 'Frequent question', 'We answer'],
    headline: ['Do you deliver?', 'What time do you open?', 'Do you have {product}?'],
    sub: ['Message us and we will confirm right away', 'Hours: {hours}', 'Yes, at {business}, {city}'],
    cta: ['Ask us', 'Message us', 'More info'],
    badge: ['Quick answer', 'We reply', 'Straight up'],
    caption: [
      'We get asked this every day, so here is the answer. Another question? Message {business}.',
      'Frequent question at {business}: answered. Hours: {hours}. Find us in {city}.'
    ]
  },
  behind_scenes: {
    kicker: ['How we work', 'Behind the counter', 'A normal day'],
    headline: ['A day at {business}', 'What you do not see', 'How we get ready'],
    sub: ['What you do not see from the counter', 'The people behind {business}', 'Everyday work in {city}'],
    cta: ['Follow us', 'Come meet us', 'Message us'],
    badge: ['No filters', 'For real', 'Day to day'],
    caption: [
      'A look at how we work at {business}. No script, no filters: this is a normal day in {city}.',
      'Behind every order there are people. This is {business} from the inside.'
    ]
  },
  testimonial: {
    kicker: ['{business} customer', 'Real review', 'What people say'],
    headline: ['“Super fast service and the product arrived perfect.”', '“Came for one thing, left with the whole solution.”', '“Fair price and they explain everything, no rush.”'],
    sub: ['Maria G.', 'Carlos R.', 'Ana P.'],
    cta: ['Reviews', 'Message us', 'Visit us'],
    caption: [
      'Thank you for trusting {business}. Comments like this are why we open every day in {city}.',
      'What our customers say is worth more than any ad. Thanks for choosing {business}.'
    ]
  }
}

const HASHTAGS: Record<Lang, Record<Sector, string[]>> = {
  es: {
    food: ['restaurante', 'comida', 'foodie', 'dondecomer'],
    retail: ['tienda', 'compralocal', 'novedades'],
    hardware: ['ferretería', 'herramientas', 'bricolaje', 'hogar', 'reparaciones'],
    fashion: ['zapatos', 'calzado', 'moda', 'estilo'],
    electronics: ['electrodomésticos', 'tecnología', 'hogar', 'ofertas'],
    health: ['salud', 'bienestar', 'cuidado'],
    beauty: ['belleza', 'barbería', 'estilo', 'cuidadopersonal'],
    services: ['servicios', 'taller', 'profesionales'],
    other: ['negociolocal', 'emprendimiento']
  },
  en: {
    food: ['restaurant', 'food', 'foodie', 'eatlocal'],
    retail: ['shop', 'shoplocal', 'newarrivals'],
    hardware: ['hardwarestore', 'tools', 'diy', 'home', 'repairs'],
    fashion: ['shoes', 'footwear', 'fashion', 'style'],
    electronics: ['appliances', 'tech', 'home', 'deals'],
    health: ['health', 'wellness', 'care'],
    beauty: ['beauty', 'barbershop', 'style', 'selfcare'],
    services: ['services', 'workshop', 'pros'],
    other: ['smallbusiness', 'local']
  }
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)] as T
}

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

export class MockProvider implements TextProvider {
  readonly name = 'mock' as const

  async generate(req: GenerateRequest): Promise<GeneratedCopy> {
    const b = req.business
    const lang: Lang = req.language === 'en' ? 'en' : 'es'
    const table = (lang === 'en' ? EN : ES)[req.format.id] ?? (lang === 'en' ? EN : ES).star_product
    const rnd = lcg(Date.now() ^ (req.format.id.length << 8))
    const product =
      req.topic ||
      b.starProducts.split('\n').map((s) => s.trim()).find(Boolean) ||
      req.mediaNotes[0] ||
      (lang === 'en' ? 'our star product' : 'nuestro producto estrella')
    const vars: Record<string, string> = {
      product,
      business: b.name || (lang === 'en' ? 'our store' : 'nuestra tienda'),
      city: b.city || (lang === 'en' ? 'town' : 'la ciudad'),
      hours: b.hours || (lang === 'en' ? 'see our profile' : 'consulta el perfil'),
      phone: b.phone
    }
    const fill = (s: string): string => s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    const i = Math.floor(rnd() * 3)
    const caption = fill(pick(table.caption, rnd))
    const bilingual =
      req.language === 'both' ? `${caption}\n\n${fill(pick((EN[req.format.id] ?? EN.star_product).caption, rnd))}` : caption
    const tags = [
      ...HASHTAGS[lang][b.sector],
      slug(vars.business),
      slug(vars.city),
      ...(req.language === 'both' ? HASHTAGS.en[b.sector].slice(0, 2) : [])
    ].filter(Boolean)

    return clampCopy({
      kicker: fill(table.kicker[i] ?? table.kicker[0]),
      headline: fill(table.headline[i] ?? table.headline[0]),
      sub: fill(table.sub[i] ?? table.sub[0]),
      cta: fill(table.cta[i] ?? table.cta[0]),
      badge: table.badge ? fill(table.badge[i] ?? table.badge[0]) : undefined,
      labelA: table.labelA,
      labelB: table.labelB,
      caption: bilingual,
      hashtags: tags
    })
  }
}
