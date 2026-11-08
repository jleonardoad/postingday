/**
 * Servidor local para recibir fotos y clips desde el teléfono por la misma
 * Wi-Fi. Solo responde a rutas que llevan el token de esta sesión; no hay
 * cuentas, no hay nube: el teléfono habla directamente con la laptop.
 */
import { randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces, tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import QRCode from 'qrcode'
import type { MediaItem } from '@shared/types'
import { listMedia } from '../db/media'
import { importFile, type MediaDirs } from '../media/import'
import { capturePage } from './page'

export interface CaptureInfo {
  /** URL principal (la del código QR) */
  url: string
  /** Todas las direcciones por las que se puede llegar (varias interfaces de red) */
  urls: string[]
  qrDataUrl: string
  port: number
}

interface Deps {
  dirs: MediaDirs
  getLang: () => 'es' | 'en'
  getBusinessName: () => string
  onImported: (item: MediaItem) => void
}

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024 // 1 GB
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.m4v', '.webm'])

let server: Server | null = null
let port = 0
let token = ''
let deps: Deps | null = null

export async function startCaptureServer(d: Deps): Promise<CaptureInfo> {
  deps = d
  if (!server) {
    token = randomBytes(12).toString('base64url')
    server = createServer((req, res) => {
      handle(req, res).catch((err) => {
        console.error('[capture] error', err)
        if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: (err as Error).message }))
      })
    })
    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject)
      server!.listen(0, '0.0.0.0', () => resolve())
    })
    const addr = server.address()
    port = typeof addr === 'object' && addr ? addr.port : 0
  }
  return info()
}

export function stopCaptureServer(): void {
  server?.close()
  server = null
  port = 0
}

export function lanAddresses(): string[] {
  const out: string[] = []
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family !== 'IPv4' || i.internal) continue
      // Prioriza la interfaz habitual de Wi-Fi/Ethernet en macOS y Linux
      if (/^(en0|wlan0|eth0)$/.test(name)) out.unshift(i.address)
      else out.push(i.address)
    }
  }
  return out
}

async function info(): Promise<CaptureInfo> {
  const ips = lanAddresses()
  const hosts = ips.length ? ips : ['127.0.0.1']
  const urls = hosts.map((h) => `http://${h}:${port}/c/${token}`)
  const url = urls[0]
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: '#0f172a', light: '#ffffff' } })
  return { url, urls, qrDataUrl, port }
}

function sanitizeName(raw: string): string {
  const name = basename(raw).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120)
  return name || `captura-${Date.now()}.jpg`
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!deps) return notFound(res)
  const url = new URL(req.url ?? '/', 'http://local')
  const prefix = `/c/${token}`
  if (!url.pathname.startsWith(prefix)) return notFound(res)
  const rest = url.pathname.slice(prefix.length)
  const base = prefix

  if (req.method === 'GET' && (rest === '' || rest === '/')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(capturePage({ lang: deps.getLang(), businessName: deps.getBusinessName(), base }))
    return
  }

  if (req.method === 'GET' && rest === '/list') {
    const items = listMedia().slice(0, 30).map((m) => ({ id: m.id, kind: m.kind, name: m.originalName, thumb: m.thumbName }))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ items }))
    return
  }

  if (req.method === 'GET' && rest.startsWith('/thumb/')) {
    const name = basename(decodeURIComponent(rest.slice('/thumb/'.length)))
    const file = join(deps.dirs.thumbs, name)
    try {
      await stat(file)
    } catch {
      return notFound(res)
    }
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' })
    await pipeline(createReadStream(file), res)
    return
  }

  if (req.method === 'POST' && rest === '/upload') {
    const length = Number(req.headers['content-length'] ?? 0)
    if (length > MAX_UPLOAD_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Archivo demasiado grande' }))
      return
    }
    const name = sanitizeName(url.searchParams.get('name') ?? '')
    let ext = extname(name).toLowerCase()
    if (!ext) {
      const type = String(req.headers['content-type'] ?? '')
      ext = type.startsWith('video/') ? (type.includes('quicktime') ? '.mov' : '.mp4') : type.includes('png') ? '.png' : '.jpg'
    }
    if (!ALLOWED_EXT.has(ext)) {
      res.writeHead(415, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Formato no admitido: ${ext}` }))
      return
    }
    const tmp = await mkdtemp(join(tmpdir(), 'postingday-'))
    const tmpFile = join(tmp, name.endsWith(ext) ? name : `${name}${ext}`)
    try {
      await pipeline(req, createWriteStream(tmpFile))
      const item = await importFile(tmpFile, deps.dirs)
      deps.onImported(item)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ id: item.id, kind: item.kind, name: item.originalName, thumb: item.thumbName }))
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
    return
  }

  notFound(res)
}

function notFound(res: ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
}
