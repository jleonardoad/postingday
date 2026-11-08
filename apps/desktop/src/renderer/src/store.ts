import { create } from 'zustand'
import type { OutputKind } from '@shared/formats'
import type {
  AiStatus,
  AppSettings,
  Business,
  BusinessInput,
  GenerateInput,
  MediaItem,
  MediaPatch,
  Piece,
  PiecePatch
} from '@shared/types'
import { setLanguage } from './i18n'

export type View = 'home' | 'create' | 'pieces' | 'piece' | 'profile' | 'library' | 'settings'

interface State {
  view: View
  /** Formato preseleccionado al abrir «Crear» (enlace #create/<id>) */
  initialFormat: string | null
  /** Pieza abierta en el editor */
  pieceId: number | null
  settings: AppSettings
  business: Business | null
  media: MediaItem[]
  mediaLoaded: boolean
  pieces: Piece[]
  piecesLoaded: boolean
  aiStatus: AiStatus | null
  importing: boolean
  generating: boolean
  exporting: boolean
  error: string | null

  setView: (v: View) => void
  setError: (e: string | null) => void
  loadBusiness: () => Promise<void>
  saveBusiness: (input: BusinessInput) => Promise<void>
  loadMedia: () => Promise<void>
  importMedia: () => Promise<number>
  removeMedia: (id: number) => Promise<void>
  updateMedia: (id: number, patch: MediaPatch) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  loadPieces: () => Promise<void>
  loadAiStatus: () => Promise<void>
  generate: (input: GenerateInput) => Promise<Piece | null>
  openPiece: (id: number) => void
  updatePiece: (id: number, patch: PiecePatch) => Promise<void>
  removePiece: (id: number) => Promise<void>
  exportPiece: (id: number, ratio: OutputKind) => Promise<string | null>
  setAiKey: (key: string | null) => Promise<void>
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

const VIEWS: View[] = ['home', 'create', 'pieces', 'piece', 'profile', 'library', 'settings']

function initialRoute(): { view: View; initialFormat: string | null; pieceId: number | null } {
  const [view, arg] = window.location.hash.replace('#', '').split('/')
  if (!VIEWS.includes(view as View)) return { view: 'home', initialFormat: null, pieceId: null }
  if (view === 'piece') return { view: 'piece', initialFormat: null, pieceId: Number(arg) || null }
  return { view: view as View, initialFormat: arg || null, pieceId: null }
}

export const useStore = create<State>((set, get) => ({
  ...initialRoute(),
  settings: { uiLanguage: 'es' },
  business: null,
  media: [],
  mediaLoaded: false,
  pieces: [],
  piecesLoaded: false,
  aiStatus: null,
  importing: false,
  generating: false,
  exporting: false,
  error: null,

  setView: (view) => set({ view }),
  setError: (error) => set({ error }),

  loadBusiness: async () => {
    try {
      set({ business: await window.api.business.get() })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  saveBusiness: async (input) => {
    try {
      set({ business: await window.api.business.save(input), error: null })
    } catch (err) {
      set({ error: message(err) })
      throw err
    }
  },

  loadMedia: async () => {
    try {
      set({ media: await window.api.media.list(), mediaLoaded: true })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  importMedia: async () => {
    set({ importing: true })
    try {
      const added = await window.api.media.import()
      if (added.length) set({ media: [...added, ...get().media] })
      return added.length
    } catch (err) {
      set({ error: message(err) })
      return 0
    } finally {
      set({ importing: false })
    }
  },

  removeMedia: async (id) => {
    try {
      await window.api.media.remove(id)
      set({ media: get().media.filter((m) => m.id !== id) })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  updateMedia: async (id, patch) => {
    try {
      const updated = await window.api.media.update(id, patch)
      set({ media: get().media.map((m) => (m.id === id ? updated : m)) })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  updateSettings: async (patch) => {
    try {
      const settings = await window.api.settings.set(patch)
      if (patch.uiLanguage) await setLanguage(settings.uiLanguage)
      set({ settings })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  loadPieces: async () => {
    try {
      set({ pieces: await window.api.pieces.list(), piecesLoaded: true })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  loadAiStatus: async () => {
    try {
      set({ aiStatus: await window.api.ai.status() })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  generate: async (input) => {
    set({ generating: true, error: null })
    try {
      const piece = await window.api.content.generate(input)
      const others = get().pieces.filter((p) => p.id !== piece.id)
      set({ pieces: [piece, ...others] })
      return piece
    } catch (err) {
      set({ error: message(err) })
      return null
    } finally {
      set({ generating: false })
    }
  },

  openPiece: (id) => set({ view: 'piece', pieceId: id }),

  updatePiece: async (id, patch) => {
    try {
      const updated = await window.api.pieces.update(id, patch)
      set({ pieces: get().pieces.map((p) => (p.id === id ? updated : p)) })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  removePiece: async (id) => {
    try {
      await window.api.pieces.remove(id)
      set({ pieces: get().pieces.filter((p) => p.id !== id), pieceId: get().pieceId === id ? null : get().pieceId })
    } catch (err) {
      set({ error: message(err) })
    }
  },

  exportPiece: async (id, ratio) => {
    set({ exporting: true })
    try {
      const file = await window.api.pieces.export(id, ratio)
      set({
        pieces: get().pieces.map((p) => (p.id === id ? (ratio === 'reel' ? { ...p, videoPath: file } : { ...p, exportPath: file }) : p))
      })
      return file
    } catch (err) {
      set({ error: message(err) })
      return null
    } finally {
      set({ exporting: false })
    }
  },

  setAiKey: async (key) => {
    try {
      set({ aiStatus: await window.api.ai.setKey(key), error: null })
    } catch (err) {
      set({ error: message(err) })
    }
  }
}))
