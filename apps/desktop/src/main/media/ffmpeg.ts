import { execFile } from 'node:child_process'
import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'

const run = promisify(execFile)

/**
 * Localiza ffmpeg/ffprobe en este orden:
 *   1. variables PD_FFMPEG / PD_FFPROBE (útil en desarrollo)
 *   2. binarios empaquetados en resources/bin (producción, sprint 4)
 *   3. el PATH del sistema
 */
let resolved: { ffmpeg: string | null; ffprobe: string | null } | null = null

export async function resolveBinaries(): Promise<{ ffmpeg: string | null; ffprobe: string | null }> {
  if (resolved) return resolved
  resolved = {
    ffmpeg: await findBinary('ffmpeg', process.env.PD_FFMPEG),
    ffprobe: await findBinary('ffprobe', process.env.PD_FFPROBE)
  }
  return resolved
}

async function findBinary(name: string, envOverride?: string): Promise<string | null> {
  const candidates: string[] = []
  if (envOverride) candidates.push(envOverride)
  const exe = process.platform === 'win32' ? `${name}.exe` : name
  candidates.push(join(process.resourcesPath ?? '', 'bin', exe))
  if (process.platform === 'darwin') candidates.push(`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`)
  for (const c of candidates) {
    if (await exists(c)) return c
  }
  // PATH del sistema
  try {
    const which = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await run(which, [name])
    const first = stdout.split(/\r?\n/).find((l) => l.trim())
    if (first) return first.trim()
  } catch {
    /* no está en el PATH */
  }
  return null
}

async function exists(p: string): Promise<boolean> {
  if (!p) return false
  try {
    await access(p, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export interface ProbeResult {
  width: number | null
  height: number | null
  durationMs: number | null
  hasVideoStream: boolean
}

export async function probe(file: string): Promise<ProbeResult> {
  const { ffprobe } = await resolveBinaries()
  if (!ffprobe) return { width: null, height: null, durationMs: null, hasVideoStream: false }
  const { stdout } = await run(ffprobe, [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    file
  ])
  const data = JSON.parse(stdout) as {
    streams?: { codec_type?: string; width?: number; height?: number; duration?: string }[]
    format?: { duration?: string }
  }
  const video = data.streams?.find((s) => s.codec_type === 'video')
  const durationSec = Number(data.format?.duration ?? video?.duration ?? NaN)
  return {
    width: video?.width ?? null,
    height: video?.height ?? null,
    durationMs: Number.isFinite(durationSec) ? Math.round(durationSec * 1000) : null,
    hasVideoStream: Boolean(video)
  }
}

/** Genera una miniatura JPG de 480 px de ancho. Para vídeo toma un fotograma al segundo 1. */
export async function makeThumbnail(
  src: string,
  dest: string,
  kind: 'image' | 'video',
  durationMs: number | null
): Promise<boolean> {
  const { ffmpeg } = await resolveBinaries()
  if (!ffmpeg) return false
  const args = ['-y', '-v', 'error']
  if (kind === 'video') {
    const seek = durationMs !== null && durationMs < 1500 ? '0' : '1'
    args.push('-ss', seek)
  }
  args.push('-i', src, '-vf', 'scale=480:-2', '-frames:v', '1', '-q:v', '4', dest)
  try {
    await run(ffmpeg, args)
    return true
  } catch {
    return false
  }
}

export function appResourcesPath(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
}
