/**
 * Ensambla el reel con FFmpeg: fotos con Ken Burns o fragmentos de clip,
 * una capa PNG transparente de texto por escena (con fundido), concatenación
 * y música de fondo. Salida: MP4 H.264 1080×1920 a 30 fps con AAC.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { MediaItem, ReelScene, ReelScript } from '@shared/types'

const run = promisify(execFile)

export interface RenderInputs {
  ffmpeg: string
  script: ReelScript
  /** Ruta absoluta de cada medio usado, por id */
  mediaPaths: Map<number, string>
  mediaById: Map<number, MediaItem>
  /** PNG RGBA 1080×1920 por índice de escena */
  overlays: string[]
  musicPath: string
  /** Color de marca para las escenas sin foto, en formato 0xRRGGBB */
  cardColor: string
  outFile: string
}

export async function renderReel(inp: RenderInputs): Promise<void> {
  const { script, ffmpeg } = inp
  const W = script.width
  const H = script.height
  const fps = script.fps
  const args: string[] = ['-y', '-v', 'error', '-stats_period', '1']
  const filters: string[] = []
  let inputIndex = 0

  const addInput = (...a: string[]): number => {
    args.push(...a)
    return inputIndex++
  }

  const sceneLabels: string[] = []
  script.scenes.forEach((sc, i) => {
    const dur = sc.durationSec
    const frames = Math.round(dur * fps)
    let base: string

    if (sc.kind === 'photo' && sc.mediaId !== null) {
      const idx = addInput('-i', inp.mediaPaths.get(sc.mediaId)!)
      // Escalado al 120 % para tener margen de zoom, luego zoompan a 1080×1920
      filters.push(
        `[${idx}:v]scale=${Math.round(W * 1.2)}:${Math.round(H * 1.2)}:force_original_aspect_ratio=increase,` +
          `crop=${Math.round(W * 1.2)}:${Math.round(H * 1.2)},setsar=1,` +
          `zoompan=${kenBurnsExpr(sc.kenburns, frames)}:d=${frames}:s=${W}x${H}:fps=${fps},` +
          `trim=duration=${dur},setpts=PTS-STARTPTS,format=yuv420p[b${i}]`
      )
      base = `b${i}`
    } else if (sc.kind === 'clip' && sc.mediaId !== null) {
      const idx = addInput('-ss', String(sc.clipStartSec), '-t', String(dur + 0.5), '-i', inp.mediaPaths.get(sc.mediaId)!)
      filters.push(
        `[${idx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps},` +
          `trim=duration=${dur},setpts=PTS-STARTPTS,format=yuv420p[b${i}]`
      )
      base = `b${i}`
    } else {
      const idx = addInput('-f', 'lavfi', '-t', String(dur), '-i', `color=c=${inp.cardColor}:s=${W}x${H}:r=${fps}`)
      filters.push(`[${idx}:v]format=yuv420p[b${i}]`)
      base = `b${i}`
    }

    const ov = addInput('-loop', '1', '-framerate', String(fps), '-t', String(dur), '-i', inp.overlays[i]!)
    const fadeOut = Math.max(0, dur - 0.35)
    filters.push(`[${ov}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st=${fadeOut}:d=0.35:alpha=1[o${i}]`)
    filters.push(`[${base}][o${i}]overlay=0:0:shortest=1:format=auto,format=yuv420p,setsar=1[s${i}]`)
    sceneLabels.push(`[s${i}]`)
  })

  filters.push(`${sceneLabels.join('')}concat=n=${script.scenes.length}:v=1:a=0[v]`)

  const music = addInput('-stream_loop', '-1', '-i', inp.musicPath)
  const total = script.totalSec
  filters.push(
    `[${music}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.35,afade=t=in:st=0:d=1,afade=t=out:st=${Math.max(0, total - 1.5)}:d=1.5[a]`
  )

  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    '-t',
    String(total),
    inp.outFile
  )

  try {
    await run(ffmpeg, args, { maxBuffer: 16 * 1024 * 1024 })
  } catch (err) {
    const e = err as { stderr?: string; message: string }
    throw new Error(`FFmpeg falló: ${(e.stderr ?? e.message).split('\n').filter(Boolean).slice(-3).join(' | ')}`)
  }
}

/** Expresiones de zoompan para cada movimiento; `on` es el fotograma de salida */
function kenBurnsExpr(kind: ReelScene['kenburns'], frames: number): string {
  const center = `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
  const step = (0.18 / Math.max(1, frames)).toFixed(6)
  switch (kind) {
    case 'in':
      return `z='min(1+${step}*on,1.18)':${center}`
    case 'out':
      return `z='max(1.18-${step}*on,1)':${center}`
    case 'left':
      return `z='1.12':x='(iw-iw/zoom)*(1-on/${frames})':y='ih/2-(ih/zoom/2)'`
    case 'right':
      return `z='1.12':x='(iw-iw/zoom)*on/${frames}':y='ih/2-(ih/zoom/2)'`
    default:
      return `z='1':${center}`
  }
}
