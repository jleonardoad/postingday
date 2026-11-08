/**
 * Exportación a PNG: abre una ventana oculta con la ruta #render/<id>/<ratio>,
 * que dibuja la plantilla a tamaño real (1080 px), espera a que el renderer
 * avise de que terminó de pintar y captura la página.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BrowserWindow, ipcMain } from 'electron'
import { CANVAS, type OutputKind } from '@shared/formats'
import { CH } from '@shared/ipc'
import { getPiece, setExportPath } from '../db/pieces'

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

export async function exportPiece(id: number, ratio: OutputKind, exportsDir: string): Promise<string> {
  const piece = getPiece(id)
  if (!piece) throw new Error(`Pieza ${id} no existe`)
  const { w, h } = CANVAS[ratio]

  const win = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    useContentSize: true,
    frame: false,
    resizable: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })

  try {
    const hash = `render/${id}/${ratio}`
    const ready = waitForReady(win.webContents.id, 20_000)
    if (process.env.ELECTRON_RENDERER_URL) {
      await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
    } else {
      await win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
    }
    await ready
    // Un respiro para que Chromium componga la última capa
    await new Promise((r) => setTimeout(r, 200))

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
    const size = image.getSize()
    if (size.width === 0 || size.height === 0) throw new Error('La captura salió vacía')
    const final = size.width === w && size.height === h ? image : image.resize({ width: w, height: h, quality: 'best' })

    await mkdir(exportsDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const file = join(exportsDir, `postingday-${piece.formatId}-${id}-${ratio}-${stamp}.png`)
    await writeFile(file, final.toPNG())
    setExportPath(id, file)
    return file
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}
