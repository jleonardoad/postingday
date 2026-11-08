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
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: w - 200,
          borderRadius: 48,
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.25)',
          padding: '96px 80px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Package size={220} strokeWidth={1.2} style={{ opacity: 0.9 }} />
        <div style={{ fontSize: topic.length > 24 ? 72 : 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginTop: 40 }}>{topic}</div>
        <div style={{ fontSize: 36, marginTop: 40, opacity: 0.8 }}>{brand.name}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, textAlign: 'center', fontSize: 30, opacity: 0.7 }}>
        Imagen de ejemplo · activa la IA de imágenes en Ajustes para una foto real
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
