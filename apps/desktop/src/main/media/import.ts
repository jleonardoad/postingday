import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { BrowserWindow, dialog } from 'electron'
import type { MediaItem, MediaKind } from '@shared/types'
import { deleteMedia, insertMedia } from '../db/media'
import { makeThumbnail, probe } from './ffmpeg'

const IMAGE_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}
const VIDEO_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm'
}

export interface MediaDirs {
  media: string
  thumbs: string
}

export async function ensureDirs(dirs: MediaDirs): Promise<void> {
  await mkdir(dirs.media, { recursive: true })
  await mkdir(dirs.thumbs, { recursive: true })
}

export async function importFromDialog(win: BrowserWindow | null, dirs: MediaDirs): Promise<MediaItem[]> {
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Fotos y vídeos', extensions: [...Object.keys(IMAGE_EXT), ...Object.keys(VIDEO_EXT)].map((e) => e.slice(1)) },
      { name: 'Fotos', extensions: Object.keys(IMAGE_EXT).map((e) => e.slice(1)) },
      { name: 'Vídeos', extensions: Object.keys(VIDEO_EXT).map((e) => e.slice(1)) }
    ]
  }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (result.canceled) return []
  const imported: MediaItem[] = []
  for (const file of result.filePaths) {
    try {
      imported.push(await importFile(file, dirs))
    } catch (err) {
      console.error(`No se pudo importar ${file}:`, err)
    }
  }
  return imported
}

export async function importFile(sourcePath: string, dirs: MediaDirs): Promise<MediaItem> {
  const ext = extname(sourcePath).toLowerCase()
  let kind: MediaKind
  let mime: string
  if (ext in IMAGE_EXT) {
    kind = 'image'
    mime = IMAGE_EXT[ext]
  } else if (ext in VIDEO_EXT) {
    kind = 'video'
    mime = VIDEO_EXT[ext]
  } else {
    throw new Error(`Formato no admitido: ${ext || '(sin extensión)'}`)
  }

  const id = randomUUID()
  const fileName = `${id}${ext}`
  const dest = join(dirs.media, fileName)
  await copyFile(sourcePath, dest)
  const info = await stat(dest)

  const meta = await probe(dest).catch(() => ({
    width: null,
    height: null,
    durationMs: null,
    hasVideoStream: false
  }))

  const thumbName = `${id}.jpg`
  const ok = await makeThumbnail(dest, join(dirs.thumbs, thumbName), kind, meta.durationMs)

  return insertMedia({
    kind,
    fileName,
    originalName: basename(sourcePath),
    mime,
    width: meta.width,
    height: meta.height,
    durationMs: kind === 'video' ? meta.durationMs : null,
    sizeBytes: info.size,
    thumbName: ok ? thumbName : null
  })
}

export async function removeMedia(id: number, dirs: MediaDirs): Promise<void> {
  const item = deleteMedia(id)
  if (!item) return
  await unlink(join(dirs.media, item.fileName)).catch(() => undefined)
  if (item.thumbName) await unlink(join(dirs.thumbs, item.thumbName)).catch(() => undefined)
}
