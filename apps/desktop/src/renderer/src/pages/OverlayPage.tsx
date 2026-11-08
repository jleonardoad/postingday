import { useEffect, useState, type JSX } from 'react'
import type { ReelScene } from '@shared/types'
import { brandFromBusiness } from '../templates/brand'
import { ReelOverlay } from '../templates/ReelOverlay'
import type { Brand } from '../templates/TemplatePreview'

/**
 * Ruta #overlay/<pieceId>/<sceneIndex>: dibuja solo la capa de texto de una
 * escena sobre fondo transparente, para que el proceso principal la capture
 * como PNG con alfa.
 */
export function OverlayPage({ pieceId, sceneIndex }: { pieceId: number; sceneIndex: number }): JSX.Element | null {
  const [data, setData] = useState<{ scene: ReelScene; brand: Brand } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    ;(async () => {
      try {
        const [script, business] = await Promise.all([window.api.pieces.script(pieceId), window.api.business.get()])
        const scene = script.scenes[sceneIndex]
        if (!scene) throw new Error(`La escena ${sceneIndex} no existe`)
        setData({ scene, brand: brandFromBusiness(business, '') })
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [pieceId, sceneIndex])

  useEffect(() => {
    if (!data && !error) return
    void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.api.render.ready())))
  }, [data, error])

  if (error) return <div style={{ color: '#fff', padding: 40, fontFamily: 'sans-serif' }}>{error}</div>
  if (!data) return null
  return <ReelOverlay brand={data.brand} scene={data.scene} width={1080} />
}
