import type { Api } from '@shared/ipc'

declare global {
  interface Window {
    /** API expuesta por el preload (src/preload/index.ts) */
    api: Api
  }
}

export {}
