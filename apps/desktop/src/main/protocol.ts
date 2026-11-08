import { net, protocol } from 'electron'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Protocolo pd-media:// para que el renderer muestre archivos locales sin
 * habilitar acceso general al sistema de archivos.
 *   pd-media://local/files/<nombre>   -> carpeta de medios
 *   pd-media://local/thumbs/<nombre>  -> carpeta de miniaturas
 */
export const SCHEME = 'pd-media'

let dirs: { media: string; thumbs: string; exports: string } | null = null

export function registerSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

export function installProtocolHandler(mediaDir: string, thumbsDir: string, exportsDir: string): void {
  dirs = { media: mediaDir, thumbs: thumbsDir, exports: exportsDir }
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url)
    const [, folder, ...rest] = url.pathname.split('/')
    const name = basename(decodeURIComponent(rest.join('/')))
    if (!name || name.startsWith('.')) return new Response('Not found', { status: 404 })
    const base =
      folder === 'files' ? dirs?.media : folder === 'thumbs' ? dirs?.thumbs : folder === 'exports' ? dirs?.exports : null
    if (!base) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(join(base, name)).toString())
  })
}

export function mediaUrl(fileName: string): string {
  return `${SCHEME}://local/files/${encodeURIComponent(fileName)}`
}

export function thumbUrl(thumbName: string): string {
  return `${SCHEME}://local/thumbs/${encodeURIComponent(thumbName)}`
}

export function exportUrl(fileName: string): string {
  return `${SCHEME}://local/exports/${encodeURIComponent(basename(fileName))}`
}
