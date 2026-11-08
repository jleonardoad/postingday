import { useEffect, useState, type JSX } from 'react'
import { Package } from 'lucide-react'
import { CANVAS, type OutputKind } from '@shared/formats'
import { brandFromBusiness } from '../templates/brand'
import type { Brand } from '../templates/TemplatePreview'

/**
 * Ruta #placeholder/<temaBase64url>/<ratio>: imagen de ejemplo de un producto
 * cuando no hay clave de IA. Se captura como PNG desde el proceso principal.
 */
export function PlaceholderPage({ topicB64, ratio }: { topicB64: string; ratio: OutputKind }): JSX.Element | null {
  const [brand, setBrand] = useState<Brand | null>(null)
  const topic = decodeTopic(topicB64)
  const { w, h } = CANVAS[ratio]

  useEffect(() => {
    void window.api.business.get().then((b) => setBrand(brandFromBusiness(b, 'PostingDay')))
  }, [])

  useEffect(() => {
    if (!brand) return
    void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.api.render.ready())))
  }, [brand])

  if (!brand) return null
  return (
    <div
      style={{
        width: w,
        height: h,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        background: `linear-gradient(160deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: ratio === 'reel' ? 420 : 150
      }}
    >
      {/* Arriba, para no chocar con los textos que la plantilla pone abajo */}
      <div
        style={{
          width: w - 320,
          borderRadius: 48,
          background: 'rgba(255,255,255,0.10)',
          border: '2px solid rgba(255,255,255,0.22)',
          padding: '56px 60px',
          textAlign: 'center'
        }}
      >
        <Package size={150} strokeWidth={1.2} style={{ opacity: 0.85 }} />
        <div style={{ fontSize: topic.length > 24 ? 52 : 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginTop: 24, opacity: 0.92 }}>{topic}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 48, textAlign: 'center', fontSize: 28, opacity: 0.55, letterSpacing: 1 }}>
        IMAGEN DE EJEMPLO · activa la IA de imágenes en Ajustes
      </div>
    </div>
  )
}

function decodeTopic(b64: string): string {
  try {
    const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))) || 'Producto'
  } catch {
    return 'Producto'
  }
}
