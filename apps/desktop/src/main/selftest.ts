/**
 * Autoprueba del proceso principal. Se activa con PD_SELFTEST=1 y sirve para
 * verificar sin interfaz que la base de datos, la importación de medios,
 * FFmpeg, la generación de textos y la exportación a PNG funcionan aquí.
 *   PD_IMPORT_FILES=a.jpg,b.mp4   importa esos archivos como si fueran del diálogo
 *   PD_SELFTEST_CLAUDE=1          prueba también el proveedor Claude (necesita clave)
 */
import { stat } from 'node:fs/promises'
import { FORMATS } from '@shared/formats'
import { emptyBusiness } from '@shared/types'
import { ClaudeProvider, describeClaudeError } from './content/claude'
import { aiStatus, generatePiece } from './content/generate'
import { getBusiness, saveBusiness } from './db/business'
import { listMedia, updateMedia } from './db/media'
import { listPieces, updatePiece } from './db/pieces'
import { getSettings } from './db/settings'
import { resolveBinaries } from './media/ffmpeg'
import { importFile, type MediaDirs } from './media/import'
import { exportPiece } from './render/export'

const log = (...args: unknown[]): void => console.log('[selftest]', ...args)

export async function runSelfTest(dirs: MediaDirs, exportsDir: string): Promise<void> {
  log('ffmpeg', await resolveBinaries())
  log('settings', getSettings())
  log('ai', aiStatus())

  const { updatedAt: _ignored, ...base } = emptyBusiness
  const saved = saveBusiness({
    ...base,
    name: 'Ferretería El Tornillo',
    sector: 'hardware',
    city: 'Caracas',
    description:
      'Ferretería de barrio con 20 años. Vendemos herramientas, pintura y plomería a dueños de casa y maestros de obra.',
    audience: 'Personas de 30 a 60 años que arreglan su casa el fin de semana y maestros de obra de la zona.',
    tone: 'close',
    language: 'es',
    starProducts: 'Taladro inalámbrico 20V\nPintura lavable 4L\nKit de plomería básica',
    neverSay: 'No prometer envíos gratis. No hablar de la competencia.',
    networks: ['instagram', 'facebook', 'tiktok'],
    phone: '+58 412 000 0000',
    address: 'Av. Principal, local 3',
    hours: 'Lun–Sáb 8:00–18:00'
  })
  log('business.save ok:', saved.name, saved.updatedAt)
  log('business.get ok:', getBusiness().name === saved.name)

  const files = (process.env.PD_IMPORT_FILES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const f of files) {
    try {
      const item = await importFile(f, dirs)
      log('import ok:', item.originalName, item.kind, `${item.width}x${item.height}`, item.thumbName ? 'miniatura ok' : 'SIN MINIATURA')
    } catch (err) {
      log('import ERROR:', f, (err as Error).message)
    }
  }

  const all = listMedia()
  log('media.list:', all.length, 'archivos')
  if (all[0]) {
    const updated = updateMedia(all[0].id, { note: 'Prueba automática', tags: ['producto', 'sartén'] })
    log('media.update ok:', updated.tags.join(','), '|', updated.note)
  }

  // Generación con el proveedor activo (mock si no hay clave) y exportación a PNG
  const images = all.filter((m) => m.kind === 'image')
  try {
    const piece = await generatePiece({ formatId: 'weekly_offer', mediaIds: images.slice(0, 1).map((m) => m.id), ratio: 'post' })
    log('generate ok:', piece.provider, '|', piece.texts.kicker, '|', piece.texts.headline, '|', piece.texts.sub, '|', piece.texts.badge)
    log('caption:', piece.caption.slice(0, 90) + (piece.caption.length > 90 ? '…' : ''))
    log('hashtags:', piece.hashtags.join(' '))
    const approved = updatePiece(piece.id, { status: 'approved' })
    log('pieces.update ok:', approved.status, '| total piezas:', listPieces().length)
    try {
      const file = await exportPiece(piece.id, 'post', exportsDir)
      const info = await stat(file)
      log('export ok:', file, `${Math.round(info.size / 1024)} KB`)
    } catch (err) {
      log('export ERROR:', (err as Error).message)
    }
  } catch (err) {
    log('generate ERROR:', (err as Error).message)
  }

  if (process.env.PD_SELFTEST_CLAUDE) {
    const key = process.env.ANTHROPIC_API_KEY ?? ''
    const format = FORMATS[0]
    try {
      const copy = await new ClaudeProvider(key).generate({
        business: getBusiness(),
        format,
        ratio: 'post',
        language: 'es',
        mediaNotes: ['sartén cerámica sobre encimera']
      })
      log('claude ok:', copy.texts.headline, '|', copy.caption.slice(0, 80))
    } catch (err) {
      log('claude ERROR:', describeClaudeError(err))
    }
  }
}
