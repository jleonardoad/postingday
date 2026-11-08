/**
 * Motor de imágenes integrado: stable-diffusion.cpp (MIT) + Z-Image-Turbo (Apache-2.0).
 * Todo local y gratis: PostingDay descarga el binario y los modelos a su carpeta de
 * datos, arranca `sd-server` cuando hace falta y le pide imágenes por su API
 * compatible con Stable Diffusion WebUI (/sdapi/v1/txt2img).
 */
import { spawn, execFile, type ChildProcess } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import type { OutputKind } from '@shared/formats'

const execFileP = promisify(execFile)

/** Versión fija del binario y de los pesos: cambiar aquí es actualizar el motor */
export const ENGINE = {
  release: 'master-1056-9234ad8',
  binaryAsset: 'sd-master-9234ad8-bin-Darwin-macOS-26.7.2-arm64.zip',
  binaryUrl:
    'https://github.com/leejet/stable-diffusion.cpp/releases/download/master-1056-9234ad8/sd-master-9234ad8-bin-Darwin-macOS-26.7.2-arm64.zip',
  model: 'Z-Image-Turbo',
  files: [
    {
      name: 'z_image_turbo-Q8_0.gguf',
      url: 'https://huggingface.co/leejet/Z-Image-Turbo-GGUF/resolve/main/z_image_turbo-Q8_0.gguf',
      bytes: 6_582_000_000
    },
    {
      name: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
      url: 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
      bytes: 2_500_000_000
    },
    {
      name: 'ae.safetensors',
      url: 'https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors',
      bytes: 335_000_000
    }
  ]
} as const

export interface EngineStatus {
  supported: boolean
  installed: boolean
  binary: boolean
  models: { name: string; present: boolean }[]
  running: boolean
  port: number | null
  model: string
}

export interface EngineProgress {
  step: string
  done: number
  total: number
}

let proc: ChildProcess | null = null
let port: number | null = null
let starting: Promise<number> | null = null

export function engineDirs(userData: string): { bin: string; models: string; binary: string } {
  const bin = join(userData, 'bin', 'sdcpp')
  return { bin, models: join(userData, 'models', 'sdcpp'), binary: join(bin, 'sd-server') }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export async function engineStatus(userData: string): Promise<EngineStatus> {
  const d = engineDirs(userData)
  const supported = process.platform === 'darwin' && process.arch === 'arm64'
  const binary = await exists(d.binary)
  const models = await Promise.all(ENGINE.files.map(async (f) => ({ name: f.name, present: await exists(join(d.models, f.name)) })))
  const installed = binary && models.every((m) => m.present)
  return { supported, installed, binary, models, running: proc !== null && port !== null, port, model: ENGINE.model }
}

/** Descarga binario y pesos (reanudable: lo ya presente se salta). Informa por onProgress. */
export async function installEngine(userData: string, onProgress: (p: EngineProgress) => void): Promise<EngineStatus> {
  const d = engineDirs(userData)
  await mkdir(d.bin, { recursive: true })
  await mkdir(d.models, { recursive: true })

  if (!(await exists(d.binary))) {
    const zip = join(d.bin, ENGINE.binaryAsset)
    await download(ENGINE.binaryUrl, zip, (done, total) => onProgress({ step: 'binary', done, total }))
    await execFileP('unzip', ['-o', '-q', zip, '-d', d.bin])
    await rm(zip, { force: true })
    for (const f of await readdir(d.bin)) if (f.startsWith('sd-')) await chmod(join(d.bin, f), 0o755)
    if (!(await exists(d.binary))) throw new Error('El paquete descargado no contiene sd-server')
  }

  for (const f of ENGINE.files) {
    const target = join(d.models, f.name)
    if (await exists(target)) continue
    await download(f.url, target, (done, total) => onProgress({ step: f.name, done, total: total || f.bytes }))
  }
  return engineStatus(userData)
}

async function download(url: string, target: string, onProgress: (done: number, total: number) => void): Promise<void> {
  const part = `${target}.part`
  let offset = 0
  try {
    offset = (await stat(part)).size
  } catch {
    /* sin descarga previa */
  }
  const headers: Record<string, string> = offset > 0 ? { range: `bytes=${offset}-` } : {}
  const res = await fetch(url, { headers, redirect: 'follow' })
  if (res.status === 416) {
    await rename(part, target)
    return
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) throw new Error(`Descarga restringida (${res.status}) en ${url}`)
    throw new Error(`Descarga fallida (${res.status}) en ${url}: ${text.slice(0, 120)}`)
  }
  const resumed = res.status === 206
  const start = resumed ? offset : 0
  const total = start + Number(res.headers.get('content-length') ?? 0)
  let done = start
  const out = createWriteStream(part, { flags: resumed ? 'a' : 'w' })
  const counter = new (class extends (await import('node:stream')).Transform {
    override _transform(chunk: Buffer, _enc: string, cb: () => void): void {
      done += chunk.length
      onProgress(done, total)
      this.push(chunk)
      cb()
    }
  })()
  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), counter, out)
  await rename(part, target)
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const p = typeof addr === 'object' && addr ? addr.port : 0
      srv.close(() => (p ? resolve(p) : reject(new Error('sin puerto libre'))))
    })
    srv.on('error', reject)
  })
}

/** Arranca sd-server con Z-Image-Turbo si no está corriendo; devuelve el puerto */
export async function ensureEngine(userData: string): Promise<number> {
  if (proc && port) return port
  if (starting) return starting
  starting = (async () => {
    const d = engineDirs(userData)
    const st = await engineStatus(userData)
    if (!st.installed) throw new Error('El motor de imágenes local no está instalado (Ajustes → Instalar).')
    const p = await freePort()
    const args = [
      '--diffusion-model',
      join(d.models, 'z_image_turbo-Q8_0.gguf'),
      '--vae',
      join(d.models, 'ae.safetensors'),
      '--llm',
      join(d.models, 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf'),
      '--cfg-scale',
      '1.0',
      '--listen-ip',
      '127.0.0.1',
      '--listen-port',
      String(p)
    ]
    const child = spawn(d.binary, args, { cwd: d.bin, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout?.on('data', (b: Buffer) => process.env.PD_SD_VERBOSE && console.log('[sd-server]', b.toString().trim()))
    child.stderr?.on('data', (b: Buffer) => process.env.PD_SD_VERBOSE && console.log('[sd-server]', b.toString().trim()))
    child.on('exit', (code) => {
      console.log(`[sd-server] terminó (${code})`)
      proc = null
      port = null
    })
    proc = child
    // Espera a que cargue el modelo (puede tardar 20-60 s la primera vez)
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      if (!proc) throw new Error('sd-server se cerró al arrancar. Revisa que el binario y los modelos sean válidos.')
      try {
        const r = await fetch(`http://127.0.0.1:${p}/sdapi/v1/sd-models`, { signal: AbortSignal.timeout(2000) })
        if (r.ok) {
          port = p
          return p
        }
      } catch {
        /* aún arrancando */
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    child.kill()
    throw new Error('sd-server no respondió a tiempo.')
  })()
  try {
    return await starting
  } finally {
    starting = null
  }
}

export function stopEngine(): void {
  proc?.kill()
  proc = null
  port = null
}

/** Parámetros de generación recomendados para Z-Image-Turbo */
export function engineParams(ratio: OutputKind): { width: number; height: number; steps: number; cfg_scale: number; sampler_name: string } {
  return ratio === 'reel'
    ? { width: 832, height: 1216, steps: 8, cfg_scale: 1.0, sampler_name: 'euler' }
    : { width: 1024, height: 1024, steps: 8, cfg_scale: 1.0, sampler_name: 'euler' }
}
