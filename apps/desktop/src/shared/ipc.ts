import type { OutputKind } from './formats'
import type {
  AiStatus,
  AppPaths,
  AppSettings,
  Business,
  BusinessInput,
  GenerateInput,
  MediaItem,
  MediaPatch,
  Piece,
  PiecePatch,
  ReelScript
} from './types'

/** Nombres de canal IPC. Un solo sitio para no desincronizar main y preload. */
export const CH = {
  appVersion: 'app:version',
  appPaths: 'app:paths',
  appOpenPath: 'app:openPath',
  appReveal: 'app:reveal',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  businessGet: 'business:get',
  businessSave: 'business:save',
  mediaList: 'media:list',
  mediaImport: 'media:import',
  mediaRemove: 'media:remove',
  mediaUpdate: 'media:update',
  contentGenerate: 'content:generate',
  piecesList: 'pieces:list',
  piecesGet: 'pieces:get',
  piecesUpdate: 'pieces:update',
  piecesRemove: 'pieces:remove',
  piecesExport: 'pieces:export',
  piecesScript: 'pieces:script',
  aiStatus: 'ai:status',
  aiSetKey: 'ai:setKey',
  captureStart: 'capture:start',
  /** Evento main → renderer: la biblioteca cambió (p. ej. llegó una foto desde el teléfono) */
  mediaChanged: 'media:changed',
  /** Lo envía la ventana oculta de render cuando la plantilla terminó de pintarse */
  renderReady: 'render:ready'
} as const

export interface CaptureInfo {
  url: string
  urls: string[]
  qrDataUrl: string
  port: number
}

/** Contrato que el preload expone al renderer como window.api */
export interface Api {
  app: {
    version(): Promise<string>
    paths(): Promise<AppPaths>
    openPath(path: string): Promise<void>
    reveal(path: string): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    set(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  business: {
    get(): Promise<Business>
    save(input: BusinessInput): Promise<Business>
  }
  media: {
    list(): Promise<MediaItem[]>
    import(): Promise<MediaItem[]>
    remove(id: number): Promise<void>
    update(id: number, patch: MediaPatch): Promise<MediaItem>
    /** Avisa cuando la biblioteca cambia por fuera del renderer; devuelve la función para desuscribirse */
    onChanged(cb: () => void): () => void
  }
  capture: {
    /** Arranca (o reutiliza) el servidor local y devuelve la URL y el código QR para el teléfono */
    start(): Promise<CaptureInfo>
  }
  content: {
    generate(input: GenerateInput): Promise<Piece>
  }
  pieces: {
    list(): Promise<Piece[]>
    get(id: number): Promise<Piece | null>
    update(id: number, patch: PiecePatch): Promise<Piece>
    remove(id: number): Promise<void>
    /** Exporta la pieza (post → PNG, reel → MP4) y devuelve la ruta del archivo */
    export(id: number, ratio: OutputKind): Promise<string>
    /** Guion de escenas del reel (lo usa la ventana de capas y la vista previa) */
    script(id: number): Promise<ReelScript>
  }
  ai: {
    status(): Promise<AiStatus>
    setKey(key: string | null): Promise<AiStatus>
  }
  render: {
    ready(): void
  }
}
