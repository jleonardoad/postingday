/**
 * Autoprueba del proceso principal. Se activa con PD_SELFTEST=1 y sirve para
 * verificar sin interfaz que la base de datos, la importación de medios,
 * FFmpeg, la generación de textos y la exportación a PNG funcionan aquí.
 *   PD_IMPORT_FILES=a.jpg,b.mp4   importa esos archivos como si fueran del diálogo
 *   PD_SELFTEST_CLAUDE=1          prueba también el proveedor Claude (necesita clave)
 */
import { execFile } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { promisify } from 'node:util'
import { FORMATS } from '@shared/formats'
import { emptyBusiness } from '@shared/types'
import { startCaptureServer } from './capture/server'
import { ClaudeProvider, describeClaudeError } from './content/claude'
import { aiStatus, generatePiece } from './content/generate'
import { getBusiness, saveBusiness } from './db/business'
import { listMedia, updateMedia } from './db/media'
import { listPieces, updatePiece } from './db/pieces'
import { getSettings } from './db/settings'
import { generateImage } from './images/generate'
import { resolveBinaries } from './media/ffmpeg'
import { importFile, type MediaDirs } from './media/import'
import { exportPiece } from './render/export'

const log = (...args: unknown[]): void => console.log('[selftest]', ...args)
const execFileP = promisify(execFile)

export async function runSelfTest(dirs: MediaDirs, exportsDir: string, userData: string): Promise<void> {
  log('ffmpeg', await resolveBinaries())
  log('settings', getSettings())
  log('ai', JSON.stringify(await aiStatus()))

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
      const file = await exportPiece(piece.id, 'post', exportsDir, dirs, userData)
      const info = await stat(file)
      log('export ok:', file, `${Math.round(info.size / 1024)} KB`)
    } catch (err) {
      log('export ERROR:', (err as Error).message)
    }
  } catch (err) {
    log('generate ERROR:', (err as Error).message)
  }

  // E2E de un producto sin foto: PD_SELFTEST_TOPIC="destornillador de estría"
  const topic = process.env.PD_SELFTEST_TOPIC
  if (topic) {
    try {
      const t0 = Date.now()
      const img = await generateImage({ topic, style: 'studio', ratio: 'post' }, dirs)
      log('imagen ok:', img.originalName, `${img.width}x${img.height}`, img.tags.join(','), `en ${((Date.now() - t0) / 1000).toFixed(1)} s`)
      const p = await generatePiece({ formatId: 'star_product', mediaIds: [img.id], ratio: 'post', topic })
      log('pieza ok:', p.provider, '|', p.texts.kicker, '|', p.texts.headline, '|', p.texts.sub, '|', p.texts.cta)
      log('caption:', p.caption)
      log('hashtags:', p.hashtags.join(' '))
      const png = await exportPiece(p.id, 'post', exportsDir, dirs, userData)
      log('post png:', png)
      const mp4 = await exportPiece(p.id, 'reel', exportsDir, dirs, userData)
      log('reel mp4:', mp4)
      const { ffmpeg } = await resolveBinaries()
      if (ffmpeg) {
        for (const sec of [1, 6, 11]) {
          const frame = mp4.replace(/\.mp4$/, `-f${sec}.jpg`)
          await execFileP(ffmpeg, ['-y', '-v', 'error', '-ss', String(sec), '-i', mp4, '-frames:v', '1', '-q:v', '3', frame])
          log('  fotograma', sec, 's →', frame)
        }
      }
    } catch (err) {
      log('topic ERROR:', (err as Error).message)
    }
  }

  // Reels: uno con foto (Ken Burns) y otro con clip; se extraen fotogramas para revisarlos
  if (process.env.PD_SELFTEST_REEL) {
    const videos = all.filter((m) => m.kind === 'video')
    const cases: { formatId: string; mediaIds: number[] }[] = [
      { formatId: 'new_arrival', mediaIds: images.slice(0, 2).map((m) => m.id) },
      { formatId: 'how_to', mediaIds: videos.slice(0, 1).map((m) => m.id) }
    ]
    const { ffmpeg, ffprobe } = await resolveBinaries()
    for (const c of cases) {
      try {
        const p = await generatePiece({ ...c, ratio: 'reel' })
        const t0 = Date.now()
        const file = await exportPiece(p.id, 'reel', exportsDir, dirs, userData)
        const info = await stat(file)
        let duration = '?'
        if (ffprobe) {
          const { stdout } = await execFileP(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
          duration = `${Number(stdout.trim()).toFixed(1)} s`
        }
        log(`reel ${c.formatId} ok:`, file, `${Math.round(info.size / 1024)} KB`, duration, `en ${((Date.now() - t0) / 1000).toFixed(1)} s`)
        if (ffmpeg) {
          for (const sec of [1, 6, 11]) {
            const frame = file.replace(/\.mp4$/, `-f${sec}.jpg`)
            await execFileP(ffmpeg, ['-y', '-v', 'error', '-ss', String(sec), '-i', file, '-frames:v', '1', '-q:v', '3', frame])
            log('  fotograma', sec, 's →', frame)
          }
        }
      } catch (err) {
        log(`reel ${c.formatId} ERROR:`, (err as Error).message)
      }
    }
  }

  // Captura desde el teléfono: arranca el servidor local y simula un envío por HTTP
  try {
    const captureInfo = await startCaptureServer({
      dirs,
      getLang: () => 'es',
      getBusinessName: () => getBusiness().name || 'PostingDay',
      onImported: (item) => log('capture: recibido', item.originalName)
    })
    log('capture url:', captureInfo.url, '| qr:', captureInfo.qrDataUrl.length, 'bytes')
    const local = captureInfo.url.replace(/\/\/[^/]+:/, '//127.0.0.1:')
    const page = await fetch(local)
    log('capture page:', page.status, (await page.text()).includes('PostingDay') ? 'html ok' : 'HTML INESPERADO')
    const sample = files[0]
    if (sample) {
      const body = await readFile(sample)
      const up = await fetch(`${local}/upload?name=${encodeURIComponent('desde-el-celular' + extname(sample))}`, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body
      })
      log('capture upload:', up.status, await up.text())
    }
    const listed = (await (await fetch(`${local}/list`)).json()) as { items: unknown[] }
    log('capture list:', listed.items.length, 'elementos')
  } catch (err) {
    log('capture ERROR:', (err as Error).message)
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
        topic: '',
        mediaNotes: ['sartén cerámica sobre encimera']
      })
      log('claude ok:', copy.texts.headline, '|', copy.caption.slice(0, 80))
    } catch (err) {
      log('claude ERROR:', describeClaudeError(err))
    }
  }
}
