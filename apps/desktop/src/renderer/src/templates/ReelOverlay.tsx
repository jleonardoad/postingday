import type { CSSProperties, JSX } from 'react'
import type { ReelScene } from '@shared/types'
import { clamp, fitSize, type Brand } from './TemplatePreview'

/**
 * Capa de texto de una escena del reel (1080×1920, fondo transparente).
 * Se captura como PNG con alfa y FFmpeg la superpone al vídeo o a la foto.
 */
const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export function ReelOverlay({ brand, scene, width }: { brand: Brand; scene: ReelScene; width: number }): JSX.Element {
  const W = 1080
  const H = 1920
  const scale = width / W
  const t = scene.texts
  const hasBottomText = Boolean(t.headline || t.sub || t.cta)

  return (
    <div style={{ width, height: Math.round(H * scale), overflow: 'hidden', background: 'transparent', flexShrink: 0 }}>
      <div
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          fontFamily: FONT,
          color: '#fff',
          background: 'transparent'
        }}
      >
        {hasBottomText && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 980,
              background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0) 100%)'
            }}
          />
        )}

        {t.label && (
          <div style={{ position: 'absolute', left: 64, top: 150 }}>
            <Pill bg={scene.role === 'labelA' ? 'rgba(15,23,42,0.8)' : brand.primaryColor} size={56}>
              {t.label}
            </Pill>
          </div>
        )}
        {t.kicker && !t.label && (
          <div style={{ position: 'absolute', left: 64, top: 150 }}>
            <Pill bg={brand.primaryColor} size={40}>
              {t.kicker}
            </Pill>
          </div>
        )}

        {t.badge && (
          <div
            style={{
              position: 'absolute',
              right: 72,
              top: 300,
              width: 250,
              height: 250,
              borderRadius: '50%',
              background: brand.secondaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 20,
              fontSize: fitSize(t.badge, 48, 12),
              fontWeight: 800,
              lineHeight: 1.05,
              transform: 'rotate(-8deg)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
            }}
          >
            {t.badge}
          </div>
        )}

        <div style={{ position: 'absolute', left: 64, right: 64, bottom: scene.role === 'cta' ? 420 : 360 }}>
          {t.headline && (
            <div
              style={{
                fontSize: fitSize(t.headline, scene.role === 'hook' ? 124 : 84, scene.role === 'hook' ? 20 : 26),
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: -2.5,
                textShadow: '0 6px 30px rgba(0,0,0,0.45)',
                ...clamp(3)
              }}
            >
              {t.headline}
            </div>
          )}
          {t.sub && (
            <div style={{ fontSize: 54, marginTop: t.headline ? 28 : 0, lineHeight: 1.25, opacity: 0.95, textShadow: '0 4px 20px rgba(0,0,0,0.5)', ...clamp(3) }}>
              {t.sub}
            </div>
          )}
          {scene.role === 'cta' && t.cta && (
            <div style={{ marginTop: 44 }}>
              <Pill bg={brand.primaryColor} size={56}>
                {t.cta}
              </Pill>
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', left: 64, right: 64, bottom: 190, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: brand.primaryColor }} />
          <span style={{ fontSize: 42, fontWeight: 600, textShadow: '0 4px 20px rgba(0,0,0,0.6)', ...clamp(1) }}>{brand.name}</span>
        </div>
      </div>
    </div>
  )
}

function Pill({ children, bg, size }: { children: string; bg: string; size: number }): JSX.Element {
  const style: CSSProperties = {
    display: 'inline-block',
    background: bg,
    color: '#fff',
    fontSize: size,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: `${size * 0.35}px ${size * 0.8}px`,
    borderRadius: 999,
    whiteSpace: 'nowrap',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
  }
  return <span style={style}>{children}</span>
}
