/**
 * Exportación. Post → PNG capturando la plantilla a tamaño real en una
 * ventana oculta. Reel → MP4: capas de texto transparentes por escena (misma
 * técnica) + FFmpeg (ver ../video/render.ts).
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BrowserWindow, ipcMain, type NativeImage } from 'electron'
import { CANVAS, FORMATS, type OutputKind } from '@shared/formats'
import { CH } from '@shared/ipc'
import type { ReelScript } from '@shared/types'
import { getBusiness } from '../db/business'
import { listMedia } from '../db/media'
import { getPiece, setExportPath, setVideoPath } from '../db/pieces'
import { resolveBinaries } from '../media/ffmpeg'
import type { MediaDirs } from '../media/import'
import { pickMusic } from '../video/music'
import { renderReel } from '../video/render'
import { buildReelScript } from '../video/script'

const waiters = new Map<number, () => void>()

ipcMain.on(CH.renderReady, (event) => {
  waiters.get(event.sender.id)?.()
})

function waitForReady(webContentsId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(webContentsId)
      reject(new Error('La plantilla tardó demasiado en dibujarse'))
    }, timeoutMs)
    waiters.set(webContentsId, () => {
      clearTimeout(timer)
      waiters.delete(webContentsId)
      resolve()
    })
  })
}

/** Abre la ruta del renderer en una ventana oculta y devuelve la captura a tamaño exacto */
export async function captureRoute(opts: { hash: string; width: number; height: number; transparent?: boolean }): Promise<NativeImage> {
  const { width: w, height: h } = opts
  const win = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    useContentSize: true,
    frame: false,
    resizable: false,
    transparent: Boolean(opts.transparent),
    backgroundColor: opts.transparent ? '#00000000' : '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  try {
    const ready = waitForReady(win.webContents.id, 20_000)
    if (process.env.ELECTRON_RENDERER_URL) {
      await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${opts.hash}`)
    } else {
      await win.loadFile(join(__dirname, '../renderer/index.html'), { hash: opts.hash })
    }
    await ready
    await new Promise((r) => setTimeout(r, 200))
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
    const size = image.getSize()
    if (size.width === 0 || size.height === 0) throw new Error('La captura salió vacía')
    return size.width === w && size.height === h ? image : image.resize({ width: w, height: h, quality: 'best' })
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export async function exportPiece(id: number, ratio: OutputKind, exportsDir: string, dirs: MediaDirs, userData: string): Promise<string> {
  return ratio === 'reel' ? exportReel(id, exportsDir, dirs, userData) : exportPost(id, exportsDir)
}

async function exportPost(id: number, exportsDir: string): Promise<string> {
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  const { w, h } = CANVAS.post
  const image = await captureRoute({ hash: `render/${id}/post`, width: w, height: h })
  await mkdir(exportsDir, { recursive: true })
  const file = join(exportsDir, `postingday-${piece.formatId}-${id}-post-${stamp()}.png`)
  await writeFile(file, image.toPNG())
  setExportPath(id, file)
  return file
}

/** Guion del reel de una pieza (determinista; lo usan la exportación y la ventana de capas) */
export async function scriptFor(id: number, userData: string): Promise<ReelScript> {
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  const format = FORMATS.find((f) => f.id === piece.formatId) ?? FORMATS[0]!
  const { ffmpeg } = await resolveBinaries()
  const music = ffmpeg ? await pickMusic(userData, ffmpeg).catch(() => ({ path: '', name: null })) : { path: '', name: null }
  return buildReelScript(piece, format, listMedia(), music.name)
}

async function exportReel(id: number, exportsDir: string, dirs: MediaDirs, userData: string): Promise<string> {
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  const { ffmpeg } = await resolveBinaries()
  if (!ffmpeg) throw new Error('No se encontró FFmpeg; hace falta para generar el vídeo.')
  const format = FORMATS.find((f) => f.id === piece.formatId) ?? FORMATS[0]!
  const media = listMedia()
  const music = await pickMusic(userData, ffmpeg)
  const script = buildReelScript(piece, format, media, music.name)
  const { w, h } = CANVAS.reel

  const tmp = await mkdtemp(join(tmpdir(), 'postingday-reel-'))
  try {
    // Una capa de texto transparente por escena
    const overlays: string[] = []
    for (const sc of script.scenes) {
      const image = await captureRoute({ hash: `overlay/${id}/${sc.index}`, width: w, height: h, transparent: true })
      const file = join(tmp, `overlay-${sc.index}.png`)
      await writeFile(file, image.toPNG())
      overlays.push(file)
    }

    const mediaPaths = new Map<number, string>()
    const mediaById = new Map<number, (typeof media)[number]>()
    for (const m of media) {
      mediaPaths.set(m.id, join(dirs.media, m.fileName))
      mediaById.set(m.id, m)
    }

    await mkdir(exportsDir, { recursive: true })
    const outFile = join(exportsDir, `postingday-${piece.formatId}-${id}-reel-${stamp()}.mp4`)
    await renderReel({
      ffmpeg,
      script,
      mediaPaths,
      mediaById,
      overlays,
      musicPath: music.path,
      cardColor: '0x' + getBusiness().primaryColor.replace('#', ''),
      outFile
    })
    setVideoPath(id, outFile)
    return outFile
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
