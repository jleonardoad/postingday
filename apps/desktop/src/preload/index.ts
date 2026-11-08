import { contextBridge, ipcRenderer } from 'electron'
import type { OutputKind } from '@shared/formats'
import { CH, type Api } from '@shared/ipc'
import type { AppSettings, BusinessInput, GenerateInput, MediaPatch, PiecePatch } from '@shared/types'

const api: Api = {
  app: {
    version: () => ipcRenderer.invoke(CH.appVersion),
    paths: () => ipcRenderer.invoke(CH.appPaths),
    openPath: (path: string) => ipcRenderer.invoke(CH.appOpenPath, path),
    reveal: (path: string) => ipcRenderer.invoke(CH.appReveal, path)
  },
  settings: {
    get: () => ipcRenderer.invoke(CH.settingsGet),
    set: (patch: Partial<AppSettings>) => ipcRenderer.invoke(CH.settingsSet, patch)
  },
  business: {
    get: () => ipcRenderer.invoke(CH.businessGet),
    save: (input: BusinessInput) => ipcRenderer.invoke(CH.businessSave, input)
  },
  media: {
    list: () => ipcRenderer.invoke(CH.mediaList),
    import: () => ipcRenderer.invoke(CH.mediaImport),
    remove: (id: number) => ipcRenderer.invoke(CH.mediaRemove, id),
    update: (id: number, patch: MediaPatch) => ipcRenderer.invoke(CH.mediaUpdate, id, patch),
    onChanged: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on(CH.mediaChanged, listener)
      return () => ipcRenderer.removeListener(CH.mediaChanged, listener)
    }
  },
  capture: {
    start: () => ipcRenderer.invoke(CH.captureStart)
  },
  content: {
    generate: (input: GenerateInput) => ipcRenderer.invoke(CH.contentGenerate, input)
  },
  pieces: {
    list: () => ipcRenderer.invoke(CH.piecesList),
    get: (id: number) => ipcRenderer.invoke(CH.piecesGet, id),
    update: (id: number, patch: PiecePatch) => ipcRenderer.invoke(CH.piecesUpdate, id, patch),
    remove: (id: number) => ipcRenderer.invoke(CH.piecesRemove, id),
    export: (id: number, ratio: OutputKind) => ipcRenderer.invoke(CH.piecesExport, id, ratio),
    script: (id: number) => ipcRenderer.invoke(CH.piecesScript, id)
  },
  ai: {
    status: () => ipcRenderer.invoke(CH.aiStatus),
    setKey: (key: string | null) => ipcRenderer.invoke(CH.aiSetKey, key)
  },
  render: {
    ready: () => ipcRenderer.send(CH.renderReady)
  }
}

contextBridge.exposeInMainWorld('api', api)
