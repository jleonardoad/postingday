/**
 * Música de fondo. Si el usuario deja archivos en <userData>/music se usa el
 * primero (orden alfabético); si no, se genera una vez una cama suave de
 * acordes con FFmpeg (libre de derechos porque es sintética) para que el reel
 * nunca salga mudo durante las pruebas.
 */
import { execFile } from 'node:child_process'
import { access, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const MUSIC_EXT = /\.(mp3|m4a|aac|wav|ogg|flac)$/i

export async function pickMusic(userData: string, ffmpeg: string): Promise<{ path: string; name: string | null }> {
  const dir = join(userData, 'music')
  await mkdir(dir, { recursive: true })
  const files = (await readdir(dir)).filter((f) => MUSIC_EXT.test(f) && !f.startsWith('.')).sort()
  if (files[0]) return { path: join(dir, files[0]), name: files[0] }
  return { path: await demoBed(userData, ffmpeg), name: null }
}

async function demoBed(userData: string, ffmpeg: string): Promise<string> {
  const cache = join(userData, 'cache')
  await mkdir(cache, { recursive: true })
  const file = join(cache, 'demo-music-v1.wav')
  try {
    await access(file)
    return file
  } catch {
    /* se genera abajo */
  }
  // Acorde de La mayor (A3, C#4, E4, A4) con trémolo lento y un bajo suave: 60 s
  const expr =
    '0.10*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.2*t))' +
    '+0.07*sin(2*PI*277.18*t)*(0.6+0.4*sin(2*PI*0.17*t+1))' +
    '+0.07*sin(2*PI*329.63*t)*(0.6+0.4*sin(2*PI*0.23*t+2))' +
    '+0.05*sin(2*PI*440*t)*(0.5+0.5*sin(2*PI*0.11*t))' +
    '+0.06*sin(2*PI*110*t)'
  await run(ffmpeg, [
    '-y',
    '-v',
    'error',
    '-f',
    'lavfi',
    '-i',
    `aevalsrc=${expr}:s=44100:d=60`,
    '-af',
    'lowpass=f=1500,afade=t=in:st=0:d=2',
    '-c:a',
    'pcm_s16le',
    file
  ])
  return file
}
