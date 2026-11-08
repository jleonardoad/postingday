import { useEffect, useState, type JSX } from 'react'
import { CANVAS, FORMATS, type OutputKind } from '@shared/formats'
import type { Piece } from '@shared/types'
import { brandFromBusiness } from '../templates/brand'
import { TemplatePreview, type Brand } from '../templates/TemplatePreview'

/**
 * Ruta #render/<id>/<ratio>: dibuja una pieza a tamaño real en una ventana
 * oculta para que el proceso principal la capture como PNG. Sin barra lateral,
 * sin i18n: solo la plantilla. Avisa con render.ready() cuando las imágenes
 * están cargadas.
 */
export function RenderPage({ pieceId, ratio }: { pieceId: number; ratio: OutputKind }): JSX.Element | null {
  const [data, setData] = useState<{ piece: Piece; photos: string[]; brand: Brand } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.background = '#000'
    ;(async () => {
      try {
        const [piece, business, media] = await Promise.all([window.api.pieces.get(pieceId), window.api.business.get(), window.api.media.list()])
        if (!piece) throw new Error(`Pieza ${pieceId} no existe`)
        const photos = piece.mediaIds.map((id) => media.find((m) => m.id === id)?.url).filter((u): u is string => Boolean(u))
        setData({ piece, photos, brand: brandFromBusiness(business, '') })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [pieceId])

  useEffect(() => {
    if (!data && !error) return
    const images = Array.from(document.images)
    const loads = images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve()
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
    )
    void Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.api.render.ready())))
  }, [data, error])

  if (error) return <div style={{ color: '#fff', padding: 40, fontFamily: 'sans-serif' }}>{error}</div>
  if (!data) return null
  const format = FORMATS.find((f) => f.id === data.piece.formatId) ?? FORMATS[0]
  return <TemplatePreview kind={format.kind} ratio={ratio} brand={data.brand} photos={data.photos} texts={data.piece.texts} width={CANVAS[ratio].w} />
}
