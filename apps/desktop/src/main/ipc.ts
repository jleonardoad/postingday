import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { z } from 'zod'
import { CH } from '@shared/ipc'
import {
  businessSchema,
  generateInputSchema,
  mediaPatchSchema,
  piecePatchSchema,
  settingsSchema,
  type AppPaths
} from '@shared/types'
import { aiStatus, generatePiece, setApiKey } from './content/generate'
import { getBusiness, saveBusiness } from './db/business'
import { listMedia, updateMedia } from './db/media'
import { deletePiece, getPiece, listPieces, updatePiece } from './db/pieces'
import { getSettings, setSettings } from './db/settings'
import { resolveBinaries } from './media/ffmpeg'
import { importFromDialog, removeMedia, type MediaDirs } from './media/import'
import { exportPiece } from './render/export'

export interface IpcContext {
  paths: Omit<AppPaths, 'ffmpeg' | 'ffprobe'>
  dirs: MediaDirs
  getWindow: () => BrowserWindow | null
}

const idSchema = z.number().int().positive()
const ratioSchema = z.enum(['post', 'reel'])

export function registerIpc(ctx: IpcContext): void {
  const insideApp = (p: string): boolean => {
    const allowed = [ctx.paths.userData, ctx.paths.media, ctx.paths.thumbs, ctx.paths.exports]
    return allowed.some((a) => p === a || p.startsWith(a + '/'))
  }

  ipcMain.handle(CH.appVersion, () => app.getVersion())

  ipcMain.handle(CH.appPaths, async (): Promise<AppPaths> => {
    const bins = await resolveBinaries()
    return { ...ctx.paths, ffmpeg: bins.ffmpeg, ffprobe: bins.ffprobe }
  })

  ipcMain.handle(CH.appOpenPath, async (_e, target: unknown) => {
    const p = z.string().min(1).parse(target)
    if (!insideApp(p)) throw new Error('Ruta no permitida')
    const err = await shell.openPath(p)
    if (err) throw new Error(err)
  })

  ipcMain.handle(CH.appReveal, (_e, target: unknown) => {
    const p = z.string().min(1).parse(target)
    if (!insideApp(p)) throw new Error('Ruta no permitida')
    shell.showItemInFolder(p)
  })

  ipcMain.handle(CH.settingsGet, () => getSettings())
  ipcMain.handle(CH.settingsSet, (_e, patch: unknown) => setSettings(settingsSchema.partial().parse(patch)))

  ipcMain.handle(CH.businessGet, () => getBusiness())
  ipcMain.handle(CH.businessSave, (_e, input: unknown) => saveBusiness(businessSchema.parse(input)))

  ipcMain.handle(CH.mediaList, () => listMedia())
  ipcMain.handle(CH.mediaImport, () => importFromDialog(ctx.getWindow(), ctx.dirs))
  ipcMain.handle(CH.mediaRemove, (_e, id: unknown) => removeMedia(idSchema.parse(id), ctx.dirs))
  ipcMain.handle(CH.mediaUpdate, (_e, id: unknown, patch: unknown) =>
    updateMedia(idSchema.parse(id), mediaPatchSchema.parse(patch))
  )

  ipcMain.handle(CH.contentGenerate, (_e, input: unknown) => generatePiece(generateInputSchema.parse(input)))

  ipcMain.handle(CH.piecesList, () => listPieces())
  ipcMain.handle(CH.piecesGet, (_e, id: unknown) => getPiece(idSchema.parse(id)))
  ipcMain.handle(CH.piecesUpdate, (_e, id: unknown, patch: unknown) =>
    updatePiece(idSchema.parse(id), piecePatchSchema.parse(patch))
  )
  ipcMain.handle(CH.piecesRemove, (_e, id: unknown) => {
    deletePiece(idSchema.parse(id))
  })
  ipcMain.handle(CH.piecesExport, (_e, id: unknown, ratio: unknown) =>
    exportPiece(idSchema.parse(id), ratioSchema.parse(ratio), ctx.paths.exports)
  )

  ipcMain.handle(CH.aiStatus, () => aiStatus())
  ipcMain.handle(CH.aiSetKey, (_e, key: unknown) => setApiKey(z.string().nullable().parse(key)))
}
