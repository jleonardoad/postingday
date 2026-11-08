import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { app, BrowserWindow, shell } from 'electron'
import { closeDb, openDb } from './db'
import { registerIpc } from './ipc'
import { ensureDirs } from './media/import'
import { installProtocolHandler, registerSchemePrivileges } from './protocol'
import { runSelfTest } from './selftest'

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null

// Nombre visible y carpeta de datos (~/Library/Application Support/PostingDay)
app.setName('PostingDay')
registerSchemePrivileges()

/** Vista inicial para capturas y enlaces: PD_VIEW=library abre la biblioteca. */
const initialHash = process.env.PD_VIEW ? `#${process.env.PD_VIEW}` : ''

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'PostingDay',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Enlaces externos: siempre en el navegador del sistema, nunca dentro de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL + initialHash)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: initialHash.slice(1) })
  }

  // Captura de pantalla automática para verificar la interfaz sin intervención manual:
  //   PD_SCREENSHOT=/ruta/salida.png pnpm dev
  const shot = process.env.PD_SCREENSHOT
  if (shot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await win.webContents.capturePage()
          await writeFile(shot, image.toPNG())
          console.log(`[postingday] captura guardada en ${shot}`)
        } catch (err) {
          console.error('[postingday] no se pudo capturar la pantalla', err)
        } finally {
          app.quit()
        }
      }, Number(process.env.PD_SCREENSHOT_DELAY ?? 1500))
    })
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  return win
}

async function bootstrap(): Promise<void> {
  const userData = app.getPath('userData')
  const dirs = { media: join(userData, 'media'), thumbs: join(userData, 'thumbs') }
  const exportsDir = join(userData, 'exports')
  await mkdir(userData, { recursive: true })
  await ensureDirs(dirs)
  await mkdir(exportsDir, { recursive: true })

  const dbPath = join(userData, 'postingday.db')
  openDb(dbPath)
  installProtocolHandler(dirs.media, dirs.thumbs)

  registerIpc({
    paths: { userData, media: dirs.media, thumbs: dirs.thumbs, exports: exportsDir, db: dbPath },
    dirs,
    getWindow: () => mainWindow
  })

  if (process.env.PD_SELFTEST) await runSelfTest(dirs, exportsDir)

  mainWindow = createWindow()
}

app.whenReady().then(() => {
  bootstrap().catch((err) => {
    console.error('[postingday] error al iniciar', err)
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => closeDb())
